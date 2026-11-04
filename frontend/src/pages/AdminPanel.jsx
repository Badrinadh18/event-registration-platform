import { useState, useEffect, useContext } from 'react';
import api from '../api/axiosConfig';
import { AuthContext } from '../context/AuthContext';

export default function AdminPanel() {
    const { user } = useContext(AuthContext);
    
    const [formData, setFormData] = useState({ name: '', email: '', password: '' });
    const [message, setMessage] = useState({ type: '', text: '' });
    
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(true);

    const [actionState, setActionState] = useState({ userId: null, type: null, selectedRole: '' });

    const ALL_ROLES = ['ADMIN', 'ORGANISER', 'ATTENDEE'];

    const fetchUsers = async () => {
        setLoadingUsers(true);
        try {
            const response = await api.get('/admin/users');
            setUsers(response.data);
        } catch (error) {
            console.error("Failed to fetch users. Ensure you have ADMIN privileges.");
        } finally {
            setLoadingUsers(false);
        }
    };

    useEffect(() => {
        if (user?.role === 'ADMIN') fetchUsers();
    }, [user]);

    const handleRoleAction = async (targetEmail, targetRole, action) => {
        try {
            await api.post(`/admin/users/${action}`, { email: targetEmail, role: targetRole });
            fetchUsers(); 
        } catch (error) {
            alert(error.response?.data?.message || `Failed to ${action}.`);
        } finally {
            setActionState({ userId: null, type: null, selectedRole: '' });
        }
    };

    const handleAdminCreate = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });
        try {
            await api.post('/auth/register', { ...formData, role: 'ADMIN' });
            setMessage({ type: 'success', text: `Successfully provisioned new Administrator account.` });
            setFormData({ name: '', email: '', password: '' });
            fetchUsers(); 
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to create user.' });
        }
    };

    const handleDeleteUser = async (userId, userEmail) => {
        if (!window.confirm(`Are you sure you want to permanently delete ${userEmail}?`)) return;
        try {
            await api.delete(`/users/${userId}`);
            fetchUsers();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to delete user.');
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-12">
            <h1 className="text-3xl font-bold">Admin Control Panel</h1>
            
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Left Column: STRICTLY Admin User Provisioning Form */}
                <div className="xl:col-span-1 bg-brand-card p-6 rounded-xl border border-slate-700/50 h-fit">
                    <h2 className="text-xl font-bold mb-4 border-b border-slate-700 pb-2">Create Admin User</h2>
                    
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
                        
                        <div className="bg-purple-900/20 border border-purple-900/50 p-3 rounded text-xs text-purple-300">
                            <strong>Note:</strong> Users created here will have unrestricted Administrator access.
                        </div>

                        <button type="submit" className="w-full bg-brand-primary hover:bg-indigo-500 text-white font-bold py-3 rounded transition mt-4">
                            Create Administrator
                        </button>
                    </form>
                </div>

                {/* Right Column: User Management Table */}
                <div className="xl:col-span-2 bg-brand-card p-6 rounded-xl border border-slate-700/50">
                    <div className="flex justify-between items-center mb-4 border-b border-slate-700 pb-2">
                        <h2 className="text-xl font-bold">System Management Directory</h2>
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
                                        <th className="p-3 font-medium">Roles</th>
                                        <th className="p-3 font-medium text-right min-w-[280px]">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.length > 0 ? users.map((u) => {
                                        const currentRoles = u.roles || [];
                                        const missingRoles = ALL_ROLES.filter(r => !currentRoles.includes(r));
                                        
                                        const canGrant = missingRoles.length > 0;
                                        const canRevoke = currentRoles.length > 1;
                                        const isEditingThisUser = actionState.userId === u.userId;

                                        return (
                                            <tr key={u.userId} className="border-b border-slate-700/50 hover:bg-slate-800/20 transition text-sm">
                                                <td className="p-3 font-medium">{u.name}</td>
                                                <td className="p-3 text-slate-300">{u.email}</td>
                                                <td className="p-3">
                                                    <div className="flex gap-1 flex-wrap">
                                                        {currentRoles.map(role => (
                                                            <span key={role} className={`px-2 py-1 rounded text-[10px] font-bold tracking-wider ${
                                                                role === 'ADMIN' ? 'bg-purple-900/50 text-purple-400' :
                                                                role === 'ORGANISER' ? 'bg-blue-900/50 text-blue-400' :
                                                                'bg-slate-700 text-slate-300'
                                                            }`}>
                                                                {role}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                                
                                                <td className="p-3 text-right">
                                                    {u.email !== user?.email && (
                                                        <div className="flex gap-2 justify-end items-center">
                                                            {isEditingThisUser ? (
                                                                <div className="flex items-center gap-2 bg-slate-900/80 p-2 rounded-lg border border-brand-primary shadow-[0_0_15px_rgba(99,102,241,0.2)] transition-all">
                                                                    <select 
                                                                        className="bg-slate-800 text-xs text-white outline-none border border-slate-600 rounded px-3 py-1.5 cursor-pointer hover:border-brand-primary focus:border-brand-primary transition appearance-none min-w-[120px]"
                                                                        value={actionState.selectedRole}
                                                                        onChange={(e) => setActionState({ ...actionState, selectedRole: e.target.value })}
                                                                    >
                                                                        <option value="" disabled className="bg-slate-800 text-slate-400">Select Role...</option>
                                                                        {(actionState.type === 'GRANT' ? missingRoles : currentRoles).map(r => (
                                                                            <option key={r} value={r} className="bg-slate-800 text-white font-medium py-1">{r}</option>
                                                                        ))}
                                                                    </select>
                                                                    
                                                                    <button 
                                                                        disabled={!actionState.selectedRole}
                                                                        onClick={() => handleRoleAction(u.email, actionState.selectedRole, actionState.type === 'GRANT' ? 'grant-role' : 'revoke-role')}
                                                                        className="text-white bg-brand-primary disabled:bg-slate-700 disabled:text-slate-500 px-3 py-1.5 rounded text-xs font-bold hover:bg-indigo-500 transition"
                                                                    >
                                                                        Confirm
                                                                    </button>
                                                                    <button onClick={() => setActionState({ userId: null, type: null, selectedRole: '' })} 
                                                                        className="text-slate-400 hover:text-red-400 bg-slate-800 border border-slate-600 hover:border-red-900 hover:bg-red-900/30 p-1.5 rounded transition">
                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    {canGrant && (
                                                                        <button onClick={() => setActionState({ userId: u.userId, type: 'GRANT', selectedRole: '' })}
                                                                            className="text-blue-400 hover:text-blue-300 font-medium text-xs bg-blue-900/20 hover:bg-blue-900/40 px-3 py-1.5 rounded transition">
                                                                            Grant Access
                                                                        </button>
                                                                    )}
                                                                    
                                                                    {canRevoke && (
                                                                        <button onClick={() => setActionState({ userId: u.userId, type: 'REVOKE', selectedRole: '' })}
                                                                            className="text-orange-400 hover:text-orange-300 font-medium text-xs bg-orange-900/20 hover:bg-orange-900/40 px-3 py-1.5 rounded transition">
                                                                            Revoke Access
                                                                        </button>
                                                                    )}
                                                                    
                                                                    <button onClick={() => handleDeleteUser(u.userId, u.email)}
                                                                        className="text-red-400 hover:text-red-300 font-medium text-xs bg-red-900/20 hover:bg-red-900/40 px-3 py-1.5 rounded transition ml-1">
                                                                        Delete
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan="4" className="p-8 text-center text-slate-400">
                                                No management users found.
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