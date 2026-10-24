import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function CommentSection({ postId, currentUserId }) {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');

    useEffect(() => {
        fetchComments();
    }, [postId]);

    const fetchComments = async () => {
        try {
            const res = await axios.get(`http://localhost:5000/api/comments/post/${postId}`);
            if (res.data.success) {
                setComments(res.data.data);
            }
        } catch (err) {
            console.error('Lỗi tải bình luận:', err);
        }
    };

    // Gửi bình luận mới
    const handleSendComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        try {
            const res = await axios.post('http://localhost:5000/api/comments', {
                post_id: postId,
                user_id: currentUserId, 
                content: newComment
            });
            if (res.data.success) {
                setComments([...comments, res.data.data]); 
                setNewComment(''); 
            }
        } catch (err) {
            console.error('Lỗi gửi bình luận:', err);
        }
    };

    return (
        <div className="comment-section mt-3">
            {}
            <div className="comment-list space-y-2 mb-3">
                {comments.map((cmt) => (
                    <div key={cmt.id} className="flex items-start space-x-2 text-sm bg-gray-50 p-2 rounded-lg">
                        <img 
                            src={cmt.avatar_url || 'https://via.placeholder.com/32'} 
                            alt="avatar" 
                            className="w-8 h-8 rounded-full object-cover" 
                        />
                        <div className="flex-1">
                            <span className="font-semibold">{cmt.full_name || cmt.username}</span>
                            <p className="text-gray-700">{cmt.content}</p>
                        </div>
                    </div>
                ))}
            </div>

            {}
            <form onSubmit={handleSendComment} className="flex gap-2">
                <input 
                    type="text" 
                    value={newComment} 
                    onChange={(e) => setNewComment(e.target.value)} 
                    placeholder="Viết bình luận..." 
                    className="flex-1 border rounded-full px-4 py-1.5 text-sm focus:outline-none focus:border-blue-500"
                />
                <button type="submit" className="bg-blue-500 text-white px-4 py-1.5 rounded-full text-sm font-medium hover:bg-blue-600">
                    Gửi
                </button>
            </form>
        </div>
    );
}