import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Navbar from '../components/NavBar';
import PostList from '../components/PostList';
import styles from '../components/posts.module.css';
import { assetUrl, fetchAPI } from '../services/api';

function UserResults({ query }) {
  const [page, setPage] = useState(1);
  const [state, setState] = useState({ loading: true });

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ q: query, page });
    fetchAPI('/search/users?' + params, { signal: controller.signal })
      .then((result) => setState(result))
      .catch((error) => { if (error.name !== 'AbortError') setState({ error: error.message }); });
    return () => controller.abort();
  }, [query, page]);

  function goToPage(next) {
    setState({ loading: true });
    setPage(next);
  }

  if (state.loading) return <p role="status">Đang tìm người dùng…</p>;
  if (state.error) return <p role="alert">{state.error}</p>;
  if (!state.data.length) return <p>Không tìm thấy người dùng.</p>;

  return <>
    <ul>
      {state.data.map((user) => <li key={user.id}>
        <Link to={'/profile?id=' + user.id}>
          {user.avatar && <img src={assetUrl(user.avatar)} width="32" height="32" alt="" />}
          {' '}{user.full_name} (@{user.username})
        </Link>
      </li>)}
    </ul>
    {state.pagination.totalPages > 1 && <nav className={styles.pagination} aria-label="Phân trang người dùng">
      <button disabled={page === 1} onClick={() => goToPage(page - 1)}>Trang trước</button>
      <span>Trang {page} / {state.pagination.totalPages}</span>
      <button disabled={page >= state.pagination.totalPages} onClick={() => goToPage(page + 1)}>Trang sau</button>
    </nav>}
  </>;
}

export default function Search() {
  const [params, setParams] = useSearchParams();
  const query = (params.get('q') || '').trim();
  const posts = params.get('type') === 'posts';

  return <>
    <Navbar />
    <main style={{ maxWidth: 760, margin: '24px auto', padding: '0 16px' }}>
      <h1>Kết quả tìm kiếm</h1>
      {query ? <>
        <p>Từ khóa: {query}</p>
        <nav aria-label="Loại kết quả tìm kiếm" className={styles.toolbar}>
          <button aria-pressed={!posts} disabled={!posts} onClick={() => setParams({ q: query })}>Người dùng</button>
          <button aria-pressed={posts} disabled={posts} onClick={() => setParams({ q: query, type: 'posts' })}>Bài viết</button>
        </nav>
        {posts
          ? <PostList key={query} endpoint={'/search/posts?' + new URLSearchParams({ q: query })} emptyMessage="Không tìm thấy bài viết." />
          : <UserResults key={query} query={query} />}
      </> : <p>Nhập từ khóa vào ô tìm kiếm.</p>}
    </main>
  </>;
}
