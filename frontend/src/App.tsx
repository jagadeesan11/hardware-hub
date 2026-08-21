import { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import RequireAuth from './components/RequireAuth';
import HomePage from './pages/HomePage';
import ProductsPage from './pages/ProductsPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderDetailPage from './pages/OrderDetailPage';
import OrdersPage from './pages/OrdersPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AdminProductFormPage from './pages/AdminProductFormPage';
import RequireAdmin from './components/RequireAdmin';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import NotFoundPage from './pages/NotFoundPage';
import { setUnauthorizedHandler } from './services/api';
import { useAuthStore } from './store/authStore';
import { useCartStore } from './store/cartStore';

export default function App() {
  const { restore, logout, user } = useAuthStore();
  const { fetch: fetchCart, reset: resetCart } = useCartStore();

  // Verify any persisted token once, on mount.
  useEffect(() => {
    void restore();
  }, [restore]);

  // A 401 from any request means the token died; drop the session and cart.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      logout();
      resetCart();
    });
  }, [logout, resetCart]);

  // Load the cart whenever a user becomes present, and clear it on sign-out.
  useEffect(() => {
    if (user) void fetchCart();
    else resetCart();
  }, [user, fetchCart, resetCart]);

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/products/:slug" element={<ProductDetailPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/cart"
          element={
            <RequireAuth>
              <CartPage />
            </RequireAuth>
          }
        />
        <Route
          path="/checkout"
          element={
            <RequireAuth>
              <CheckoutPage />
            </RequireAuth>
          }
        />
        <Route
          path="/orders"
          element={
            <RequireAuth>
              <OrdersPage />
            </RequireAuth>
          }
        />
        <Route
          path="/orders/:id"
          element={
            <RequireAuth>
              <OrderDetailPage />
            </RequireAuth>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminDashboardPage />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/products/new"
          element={
            <RequireAdmin>
              <AdminProductFormPage />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/products/:id/edit"
          element={
            <RequireAdmin>
              <AdminProductFormPage />
            </RequireAdmin>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
