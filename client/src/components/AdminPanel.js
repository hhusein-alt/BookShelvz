import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import AddBook from './AddBook';

const AdminPanel = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState('books');
  const [stats, setStats] = useState({
    totalBooks: 0,
    totalUsers: 0,
    totalPurchases: 0
  });

  useEffect(() => {
    checkAdminStatus();
    fetchStats();
  }, []);

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();
      
      setIsAdmin(profile?.is_admin || false);
    }
  };

  const fetchStats = async () => {
    const [
      { count: booksCount },
      { count: usersCount },
      { count: purchasesCount }
    ] = await Promise.all([
      supabase.from('books').select('*', { count: 'exact' }),
      supabase.from('user_profiles').select('*', { count: 'exact' }),
      supabase.from('purchases').select('*', { count: 'exact' })
    ]);

    setStats({
      totalBooks: booksCount,
      totalUsers: usersCount,
      totalPurchases: purchasesCount
    });
  };

  if (!isAdmin) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-red-600">Доступ запрещен</h2>
        <p className="mt-4">У вас нет прав для доступа к панели администратора.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Панель администратора</h1>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-600">Всего книг</h3>
          <p className="text-3xl font-bold text-blue-600">{stats.totalBooks}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-600">Всего пользователей</h3>
          <p className="text-3xl font-bold text-green-600">{stats.totalUsers}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-600">Всего покупок</h3>
          <p className="text-3xl font-bold text-purple-600">{stats.totalPurchases}</p>
        </div>
      </div>

      {/* Навигация */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab('books')}
          className={`px-4 py-2 rounded ${
            activeTab === 'books' ? 'bg-blue-500 text-white' : 'bg-gray-200'
          }`}
        >
          Управление книгами
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 rounded ${
            activeTab === 'users' ? 'bg-blue-500 text-white' : 'bg-gray-200'
          }`}
        >
          Пользователи
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded ${
            activeTab === 'orders' ? 'bg-blue-500 text-white' : 'bg-gray-200'
          }`}
        >
          Заказы
        </button>
      </div>

      {/* Контент */}
      <div className="bg-white rounded-lg shadow-md p-6">
        {activeTab === 'books' && <AddBook />}
        {activeTab === 'users' && <div>Список пользователей</div>}
        {activeTab === 'orders' && <div>История заказов</div>}
      </div>
    </div>
  );
};

export default AdminPanel; 