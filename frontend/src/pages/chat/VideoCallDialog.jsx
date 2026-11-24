import { useEffect, useRef, useState } from 'react';
import Modal from '../../components/Modal';
import styles from './videoCall.module.css';

function VideoTile({ stream, label, muted = false, state }) {
  const video = useRef(null);
  useEffect(() => {
    if (video.current) video.current.srcObject = stream || null;
  }, [stream]);

  return <figure className={styles.tile}>
    <video ref={video} autoPlay playsInline muted={muted} aria-label={label} />
    <figcaption>{label}{state && state !== 'connected' && (
      state === 'failed' ? ' · Kết nối thất bại' : ' · Đang kết nối…'
    )}</figcaption>
  </figure>;
}

export default function VideoCallDialog({ call, error, conversation, onAccept, onClose }) {
  const [micOn, setMicOn] = useState(true);
  const [cameraOn, setCameraOn] = useState(true);
  const memberName = (id) => {
    const user = conversation?.members?.find((member) => member.user_id === id)?.user;
    return user?.full_name || user?.username || 'Thành viên ' + id;
  };

  function toggle(tracks, enabled, setEnabled) {
    tracks.forEach((track) => { track.enabled = !enabled; });
    setEnabled(!enabled);
  }

  return <Modal title={conversation?.name || 'Cuộc gọi video'} onClose={onClose}>
    {call.phase === 'incoming' && <>
      <p>{memberName(call.callerId)} đang gọi video.</p>
      <div className={styles.actions}>
        <button onClick={onAccept}>Nhận cuộc gọi</button>
        <button onClick={onClose}>Từ chối</button>
      </div>
    </>}
    {call.phase === 'connecting' && <p role="status">Đang kết nối và xin quyền máy ảnh, micrô…</p>}
    {call.phase === 'active' && <>
      {!call.peers.length && <p role="status">Đang chờ thành viên nhận cuộc gọi…</p>}
      <div className={styles.grid}>
        <VideoTile stream={call.stream} label="Bạn" muted />
        {call.peers.map((peer) => <VideoTile key={peer.id} stream={peer.stream} state={peer.state} label={memberName(peer.id)} />)}
      </div>
      <div className={styles.actions}>
        <button onClick={() => toggle(call.stream.getAudioTracks(), micOn, setMicOn)}>{micOn ? 'Tắt micrô' : 'Bật micrô'}</button>
        <button onClick={() => toggle(call.stream.getVideoTracks(), cameraOn, setCameraOn)}>{cameraOn ? 'Tắt máy ảnh' : 'Bật máy ảnh'}</button>
        <button onClick={onClose}>Rời cuộc gọi</button>
      </div>
    </>}
    {error && <p role="alert">{error}</p>}
  </Modal>;
}
