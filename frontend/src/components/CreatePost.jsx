import React, { useEffect, useRef, useState } from 'react';
import { fetchAPI, assetUrl, readUser } from '../services/api';
import styles from './posts.module.css';

function Preview({ file }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    Promise.resolve().then(() => setUrl(objectUrl));
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return <img src={url || undefined} alt={file.name} />;
}

export default function CreatePost({ onCreated }) {
  const user = readUser() || {};
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [content, setContent] = useState('');
  const [privacy, setPrivacy] = useState('PUBLIC');
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const chooseFiles = (event) => {
    const selected = [...files, ...event.target.files];
    event.target.value = '';
    setError('');
    if (selected.length > 5) {
      setError('Mỗi bài tối đa 5 tệp.');
      return;
    }
    if (selected.some((file) => file.size > 10 * 1024 * 1024)) {
      setError('Mỗi tệp tối đa 10 MB.');
      return;
    }
    if (
      selected.some(
        (file) =>
          !/\.(jpe?g|png|webp|pdf)$/i.test(file.name) ||
          !['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)
      )
    ) {
      setError('Chỉ hỗ trợ JPG, PNG, WEBP và PDF.');
      return;
    }
    setFiles(selected);
  };

  const handleOpenWithMedia = () => {
    setIsOpenModal(true);
    setTimeout(() => {
      if (inputRef.current) inputRef.current.click();
    }, 100);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setError('');
    if (!content.trim() && !files.length) {
      setError('Hãy nhập nội dung hoặc chọn ảnh/PDF.');
      return;
    }
    setBusy(true);
    try {
      const body = new FormData();
      body.append('content', content);
      body.append('privacy', privacy);
      files.forEach((file) => body.append('media', file));
      const result = await fetchAPI('/posts', { method: 'POST', body });
      setContent('');
      setFiles([]);
      setIsOpenModal(false);
      if (onCreated) onCreated(result.data);
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  };

  const avatar = user.avatar ? { backgroundImage: `url('${assetUrl(user.avatar)}')` } : {};
  const avatarText = (user.full_name || user.username || 'U').charAt(0).toUpperCase();

  return (
    <>
      {/* THẺ BẠN ĐANG NGHĨ GÌ CHUẨN FACEBOOK */}
      <section className={styles.fbComposerCard}>
        <div className={styles.fbComposerTop}>
          <div className={styles.fbComposerAvatar} style={avatar}>
            {!user.avatar && avatarText}
          </div>
          <button
            type="button"
            className={styles.fbComposerPill}
            onClick={() => setIsOpenModal(true)}
          >
            Bạn đang nghĩ gì?
          </button>
        </div>

        <div className={styles.fbComposerDivider} />

        <div className={styles.fbComposerActions}>
          <button
            type="button"
            className={styles.fbActionBtn}
            onClick={() => setIsOpenModal(true)}
          >
            <span className={styles.iconLive}>📹</span>
            <span>Video trực tiếp</span>
          </button>

          <button
            type="button"
            className={styles.fbActionBtn}
            onClick={handleOpenWithMedia}
          >
            <span className={styles.iconPhoto}>🖼️</span>
            <span>Ảnh/video</span>
          </button>

          <button
            type="button"
            className={styles.fbActionBtn}
            onClick={() => setIsOpenModal(true)}
          >
            <span className={styles.iconReel}>🎬</span>
            <span>Thước phim</span>
          </button>
        </div>
      </section>

      {/* POPUP MODAL TẠO BÀI VIẾT KHI CLICK */}
      {isOpenModal && (
        <div
          className={styles.fbModalBackdrop}
          onClick={() => !busy && setIsOpenModal(false)}
        >
          <div
            className={styles.fbModalDialog}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.fbModalHeader}>
              <h3 className={styles.fbModalTitle}>Tạo bài viết</h3>
              <button
                type="button"
                className={styles.fbModalCloseBtn}
                onClick={() => !busy && setIsOpenModal(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={submit} className={styles.fbModalBody}>
              <div className={styles.fbUserRow}>
                <div className={styles.fbComposerAvatar} style={avatar}>
                  {!user.avatar && avatarText}
                </div>
                <div>
                  <div className={styles.fbUserName}>
                    {user.full_name || user.username || 'Bạn'}
                  </div>
                  <select
                    className={styles.fbPrivacySelect}
                    value={privacy}
                    disabled={busy}
                    onChange={(e) => setPrivacy(e.target.value)}
                  >
                    <option value="PUBLIC">🌍 Công khai</option>
                    <option value="PRIVATE">🔒 Chỉ mình tôi</option>
                  </select>
                </div>
              </div>

              <textarea
                className={styles.fbTextarea}
                maxLength={10000}
                value={content}
                disabled={busy}
                onChange={(e) => setContent(e.target.value)}
                placeholder={`${user.full_name || user.username || 'Bạn'} ơi, bạn đang nghĩ gì thế?`}
                autoFocus
              />

              {files.length > 0 && (
                <div className={styles.previews}>
                  {files.map((file, index) => (
                    <div key={index} className={styles.preview}>
                      {file.type.startsWith('image/') && <Preview file={file} />}
                      <span>{file.name}</span>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          setFiles((current) =>
                            current.filter((_, position) => position !== index)
                          )
                        }
                      >
                        Bỏ
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <input
                ref={inputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                multiple
                hidden
                onChange={chooseFiles}
                disabled={busy}
              />

              <div
                className={styles.fbMediaDropzone}
                onClick={() => inputRef.current?.click()}
              >
                🖼️ Thêm ảnh hoặc tệp đính kèm vào bài viết
              </div>

              {error && <p className={styles.error}>{error}</p>}

              <button
                type="submit"
                disabled={busy || (!content.trim() && !files.length)}
                className={styles.fbSubmitBtn}
              >
                {busy ? 'Đang đăng bài...' : 'Đăng'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
