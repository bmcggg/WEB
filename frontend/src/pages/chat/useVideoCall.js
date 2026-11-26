import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../../services/config';
import { session } from '../../services/storage';

const idle = { phase: 'idle', peers: [] };

function iceServers() {
  const servers = [{ urls: 'stun:stun.l.google.com:19302' }];
  const { VITE_TURN_URL, VITE_TURN_USERNAME, VITE_TURN_CREDENTIAL } = import.meta.env;
  if (VITE_TURN_URL && VITE_TURN_USERNAME && VITE_TURN_CREDENTIAL) {
    servers.push({ urls: VITE_TURN_URL, username: VITE_TURN_USERNAME, credential: VITE_TURN_CREDENTIAL });
  }
  return servers;
}

export default function useVideoCall() {
  const actions = useRef(null);
  const [call, setCall] = useState(idle);
  const [error, setError] = useState('');
  const [online, setOnline] = useState(false);

  useEffect(() => {
    const origin = new URL(API_BASE_URL, window.location.origin).origin;
    const socket = io(origin, { auth: (callback) => callback({ token: session.getToken() }) });
    const peers = new Map();
    const departed = new Set();
    let current = idle;
    let disposed = false;

    function update(patch) {
      current = { ...current, ...patch };
      if (!disposed) setCall(current);
    }

    function reset() {
      current.stream?.getTracks().forEach((track) => track.stop());
      for (const peer of peers.values()) peer.pc.close();
      peers.clear();
      departed.clear();
      current = idle;
      if (!disposed) setCall(idle);
    }

    async function request(event, payload) {
      if (!socket.connected) throw new Error('Chưa kết nối được máy chủ cuộc gọi.');
      const result = await socket.timeout(8000).emitWithAck(event, payload).catch(() => {
        throw new Error('Máy chủ cuộc gọi chưa phản hồi. Vui lòng thử lại.');
      });
      if (result.error) throw new Error(result.error);
      return result;
    }

    function refreshPeers() {
      update({ peers: Array.from(peers, ([id, peer]) => ({ id, stream: peer.stream, state: peer.pc.connectionState })) });
    }

    function getPeer(userId) {
      if (peers.has(userId)) return peers.get(userId);
      const pc = new RTCPeerConnection({ iceServers: iceServers() });
      const peer = { pc, queue: Promise.resolve(), candidates: [], stream: null };
      const id = current.id;
      peers.set(userId, peer);
      for (const track of current.stream.getTracks()) pc.addTrack(track, current.stream);
      pc.ontrack = ({ streams }) => {
        if (peers.get(userId) !== peer) return;
        peer.stream = streams[0];
        refreshPeers();
      };
      pc.onicecandidate = ({ candidate }) => {
        if (candidate) signal(peer, userId, id, { candidate: candidate.toJSON() });
      };
      pc.onconnectionstatechange = () => {
        if (peers.get(userId) === peer) refreshPeers();
      };
      refreshPeers();
      return peer;
    }

    function reportPeerError(peer, userId, error) {
      if (peers.get(userId) === peer) setError(error.message || 'Không thể kết nối video với một thành viên.');
    }

    function signal(peer, to, id, data) {
      return request('call:signal', { id, to, ...data }).catch((failure) => reportPeerError(peer, to, failure));
    }

    function queueSignal(userId, operation) {
      if (departed.has(userId)) return;
      const peer = getPeer(userId);
      const id = current.id;
      peer.queue = peer.queue.then(async () => {
        if (peers.get(userId) === peer) await operation(peer, id);
      }).catch((failure) => reportPeerError(peer, userId, failure));
    }

    async function begin(conversationId, inviteId) {
      if ((!inviteId && current.phase !== 'idle') || (inviteId && current.phase !== 'incoming')) return;
      setError('');
      const attempt = {};
      update({ phase: 'connecting', conversationId, id: inviteId, attempt });
      try {
        if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) {
          throw new Error('Gọi video cần trình duyệt hỗ trợ WebRTC trên HTTPS hoặc localhost.');
        }
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (current.attempt !== attempt) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        update({ stream });
        const result = await (inviteId
          ? request('call:join', { id: inviteId })
          : request('call:start', { conversationId }));
        if (current.attempt !== attempt) {
          void request('call:leave', { id: result.id }).catch(() => {});
          return;
        }
        update({ phase: 'active', id: result.id });
        for (const userId of result.peers || []) {
          queueSignal(userId, async (peer, id) => {
            await peer.pc.setLocalDescription(await peer.pc.createOffer());
            await signal(peer, userId, id, { description: peer.pc.localDescription.toJSON() });
          });
        }
      } catch (failure) {
        if (current.attempt !== attempt) return;
        reset();
        if (inviteId) void request('call:decline', { id: inviteId }).catch(() => {});
        setError(failure.name === 'NotAllowedError' ? 'Hãy cho phép trình duyệt sử dụng máy ảnh và micrô.' : failure.message);
      }
    }

    socket.on('connect', () => { setOnline(true); setError(''); });
    socket.on('connect_error', (failure) => setError(failure.message));
    socket.on('disconnect', () => {
      setOnline(false);
      if (current.phase !== 'idle') setError('Mất kết nối cuộc gọi.');
      reset();
    });
    socket.on('call:invite', (invite) => {
      if (current.phase !== 'idle') return;
      setError('');
      update({ phase: 'incoming', ...invite });
    });
    socket.on('call:ended', ({ id, reason }) => {
      if (current.id !== id) return;
      reset();
      setError(reason);
    });
    socket.on('call:peer-left', ({ id, userId }) => {
      if (current.id !== id) return;
      departed.add(userId);
      peers.get(userId)?.pc.close();
      peers.delete(userId);
      refreshPeers();
    });
    socket.on('call:signal', ({ id, from, description, candidate }) => {
      if (id !== current.id || !current.stream) return;
      queueSignal(from, async (peer) => {
        if (description) {
          await peer.pc.setRemoteDescription(description);
          for (const queued of peer.candidates.splice(0)) await peer.pc.addIceCandidate(queued);
          if (description.type === 'offer') {
            await peer.pc.setLocalDescription(await peer.pc.createAnswer());
            await signal(peer, from, id, { description: peer.pc.localDescription.toJSON() });
          }
        } else if (peer.pc.remoteDescription) {
          await peer.pc.addIceCandidate(candidate);
        } else {
          peer.candidates.push(candidate);
        }
      });
    });

    actions.current = {
      start: (conversationId) => begin(conversationId),
      accept: () => begin(current.conversationId, current.id),
      close: () => {
        const { phase, id } = current;
        reset();
        if (!id) return;
        if (phase === 'active' || phase === 'connecting') void request('call:leave', { id }).catch(() => {});
        if (phase === 'incoming' || phase === 'connecting') void request('call:decline', { id }).catch(() => {});
      },
    };
    return () => {
      disposed = true;
      actions.current = null;
      socket.removeAllListeners();
      socket.disconnect();
      reset();
    };
  }, []);

  return {
    call, error, online,
    start: (conversationId) => actions.current?.start(conversationId),
    accept: () => actions.current?.accept(),
    close: () => actions.current?.close(),
  };
}
