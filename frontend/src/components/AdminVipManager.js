import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAPI } from '../services/api';
import toast from 'react-hot-toast';

const emptyForm = {
  id: null,
  name: '',
  amount: '',
  dailyEarning: '',
  bicycleModel: '',
  bicycleColor: '',
  bicycleFeatures: '',
  isActive: true,
};

const AdminVipManager = () => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [isEditing, setIsEditing] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['adminVipLevels'],
    queryFn: async () => {
      const resp = await adminAPI.getVipLevels();
      // Handle different response structures
      if (Array.isArray(resp.data?.data)) {
        return resp.data.data;
      } else if (Array.isArray(resp.data)) {
        return resp.data;
      } else if (Array.isArray(resp)) {
        return resp;
      }
      return [];
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload) => adminAPI.createVipLevel(payload),
    onSuccess: () => {
      toast.success('VIP level created');
      queryClient.invalidateQueries(['adminVipLevels']);
      setForm(emptyForm);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Create failed'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => adminAPI.updateVipLevel(id, payload),
    onSuccess: () => {
      toast.success('VIP level updated');
      queryClient.invalidateQueries(['adminVipLevels']);
      setIsEditing(false);
      setForm(emptyForm);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Update failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => adminAPI.deleteVipLevel(id),
    onSuccess: () => {
      toast.success('VIP level deleted');
      queryClient.invalidateQueries(['adminVipLevels']);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Delete failed'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      name: form.name.trim(),
      amount: parseFloat(form.amount),
      dailyEarning: parseFloat(form.dailyEarning),
      bicycleModel: form.bicycleModel || undefined,
      bicycleColor: form.bicycleColor || undefined,
      bicycleFeatures: form.bicycleFeatures || undefined,
      isActive: !!form.isActive,
    };
    if (isEditing && form.id) {
      updateMutation.mutate({ id: form.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const startEdit = (level) => {
    setIsEditing(true);
    setForm({
      id: level.id,
      name: level.name,
      amount: level.amount,
      dailyEarning: level.dailyEarning,
      bicycleModel: level.bicycleModel || '',
      bicycleColor: level.bicycleColor || '',
      bicycleFeatures: level.bicycleFeatures || '',
      isActive: level.isActive,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">VIP Levels</h2>
        <button
          className="px-3 py-2 bg-blue-600 text-white rounded"
          onClick={() => { setIsEditing(false); setForm(emptyForm); }}
        >
          New VIP
        </button>
      </div>

      <div className="overflow-x-auto bg-white dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-700">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Amount</th>
              <th className="px-4 py-2 text-left">Daily</th>
              <th className="px-4 py-2 text-left">Active</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td className="px-4 py-3" colSpan={5}>Loading...</td></tr>
            ) : Array.isArray(data) && data.length > 0 ? data.map((lvl) => (
              <tr key={lvl.id} className="border-t border-gray-200 dark:border-gray-700">
                <td className="px-4 py-2">{lvl.name}</td>
                <td className="px-4 py-2">{lvl.amount}</td>
                <td className="px-4 py-2">{lvl.dailyEarning}</td>
                <td className="px-4 py-2">{lvl.isActive ? 'Yes' : 'No'}</td>
                <td className="px-4 py-2 space-x-2">
                  <button className="px-2 py-1 text-sm bg-gray-200 dark:bg-gray-700 rounded" onClick={() => startEdit(lvl)}>Edit</button>
                  <button className="px-2 py-1 text-sm bg-red-600 text-white rounded" onClick={() => deleteMutation.mutate(lvl.id)}>Delete</button>
                </td>
              </tr>
            )) : (
              <tr><td className="px-4 py-3 text-center text-gray-500" colSpan={5}>No VIP levels found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-md border border-gray-200 dark:border-gray-700 p-4 space-y-4">
        <h3 className="font-medium">{isEditing ? 'Edit VIP Level' : 'Create VIP Level'}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm mb-1">Name</label>
            <input className="w-full border rounded px-3 py-2 bg-transparent" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm mb-1">Amount</label>
            <input type="number" step="0.01" className="w-full border rounded px-3 py-2 bg-transparent" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm mb-1">Daily Earning</label>
            <input type="number" step="0.01" className="w-full border rounded px-3 py-2 bg-transparent" value={form.dailyEarning} onChange={(e) => setForm({ ...form, dailyEarning: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm mb-1">Bicycle Model</label>
            <input className="w-full border rounded px-3 py-2 bg-transparent" value={form.bicycleModel} onChange={(e) => setForm({ ...form, bicycleModel: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm mb-1">Bicycle Color</label>
            <input className="w-full border rounded px-3 py-2 bg-transparent" value={form.bicycleColor} onChange={(e) => setForm({ ...form, bicycleColor: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm mb-1">Bicycle Features</label>
            <input className="w-full border rounded px-3 py-2 bg-transparent" value={form.bicycleFeatures} onChange={(e) => setForm({ ...form, bicycleFeatures: e.target.value })} />
          </div>
          <div className="flex items-center space-x-2">
            <input id="isActive" type="checkbox" checked={!!form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
            <label htmlFor="isActive" className="text-sm">Active</label>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded" disabled={createMutation.isLoading || updateMutation.isLoading}>
            {isEditing ? 'Update' : 'Create'}
          </button>
          {isEditing && (
            <button type="button" className="px-4 py-2 border rounded" onClick={() => { setIsEditing(false); setForm(emptyForm); }}>
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default AdminVipManager;



