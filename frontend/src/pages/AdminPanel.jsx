import { useState, useEffect, useContext } from 'react';
import api from '../api/axiosConfig';
import { AuthContext } from '../context/AuthContext';

export default function AdminPanel() {
    const { user } = useContext(AuthContext);
    const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'ADMIN' });
    const [message, setMessage] = useState({ type: '', text: '' });
    
    // New State for User Management
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(true);

    const fetchUsers = async () => {
        setLoadingUsers(true);
        try {
            // Assumes you have a GET /api/users endpoint restricted to ADMIN
            const response = await api.get('/users');
            setUsers(response.data);
        } catch (error) {
            console.error("Failed to fetch users. Ensure GET /api/users exists and is Admin-only.");
        } finally {
            setLoadingUsers(false);
        }
    };

    useEffect(() => {
        if (user?.role === 'ADMIN') {
            fetchUsers();
        }
    }, [user]);

    const handleAdminCreate = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });
        try {
            await api.post('/auth/register', formData);
            setMessage({ type: 'success', text: `Successfully provisioned new ${formData.role} account.` });
            setFormData({ name: '', email: '', password: '', role: 'ADMIN' });
            fetchUsers(); // Refresh the table automatically
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to create user.' });
        }
    };

    const handleDeleteUser = async (userId, userEmail) => {
        if (!window.confirm(`Are you sure you want to permanently delete ${userEmail}? This will also delete their registrations.`)) return;
        try {
            // Assumes you have a DELETE /api/users/{id} endpoint
            await api.delete(`/users/${userId}`);
            fetchUsers();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to delete user.');
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold">Admin Control Panel</h1>
            
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Left Column: User Provisioning Form (Your existing code) */}
                <div className="xl:col-span-1 bg-brand-card p-6 rounded-xl border border-slate-700/50 h-fit">
                    <h2 className="text-xl font-bold mb-4 border-b border-slate-700 pb-2">Provision Account</h2>
                    
                    {message.text && (
                        <div className={`p-3 rounded mb-4 text-sm ${message.type === 'error' ? 'bg-red-900/50 text-red-200' : 'bg-green-900/50 text-green-200'}`}>
                            {message.text}
                        </div>
                    )}

                    <form onSubmit={handleAdminCreate} className="space-y-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Full Name</label>
                            <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white" />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Email</label>
                            <input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                                className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white" />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Password</label>
                            <input type="password" required value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })}
                                className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white" />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-1">Role Assignment</label>
                            <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}
                                className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-white font-bold text-brand-primary">
                                <option value="ADMIN">Administrator</option>
                                <option value="ORGANISER">Organiser</option>
                                <option value="ATTENDEE">Attendee</option>
                            </select>
                        </div>
                        <button type="submit" className="w-full bg-brand-primary hover:bg-indigo-500 text-white font-bold py-3 rounded transition mt-4">
                            Create User
                        </button>
                    </form>
                </div>

                {/* Right Column: User Management Table */}
                <div className="xl:col-span-2 bg-brand-card p-6 rounded-xl border border-slate-700/50">
                    <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
                        <h2 className="text-xl font-bold">System Users Directory</h2>
                        <button onClick={fetchUsers} className="text-sm text-brand-primary hover:text-indigo-400 transition">Refresh List</button>
                    </div>

                    {loadingUsers ? (
                        <div className="flex justify-center py-12"><div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div></div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-800/50 text-slate-400 text-sm border-b border-slate-700">
                                        <th className="p-3 font-medium">Name</th>
                                        <th className="p-3 font-medium">Email</th>
                                        <th className="p-3 font-medium">Role</th>
                                        <th className="p-3 font-medium">Status</th>
                                        <th className="p-3 font-medium text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.length > 0 ? users.map((u) => (
                                        <tr key={u.userId} className="border-b border-slate-700/50 hover:bg-slate-800/20 transition text-sm">
                                            <td className="p-3 font-medium">{u.name}</td>
                                            <td className="p-3 text-slate-300">{u.email}</td>
                                            <td className="p-3">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                    u.role === 'ADMIN' ? 'bg-purple-900/50 text-purple-400' :
                                                    u.role === 'ORGANISER' ? 'bg-blue-900/50 text-blue-400' :
                                                    'bg-slate-700 text-slate-300'
                                                }`}>
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td className="p-3">
                                                {u.verified || u.isVerified ? (
                                                    <span className="text-green-400 text-xs font-bold">Verified</span>
                                                ) : (
                                                    <span className="text-yellow-500 text-xs font-bold">Pending</span>
                                                )}
                                            </td>
                                            <td className="p-3 text-right">
                                                {u.email !== user?.email && (
                                                    <button 
                                                        onClick={() => handleDeleteUser(u.userId, u.email)}
                                                        className="text-red-400 hover:text-red-300 font-medium text-xs bg-red-900/20 px-2 py-1 rounded transition"
                                                    >
                                                        Delete
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="5" className="p-8 text-center text-slate-400">
                                                No users found or backend endpoint is missing.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}