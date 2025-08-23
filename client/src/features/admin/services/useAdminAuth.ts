import { useSelector, useDispatch } from 'react-redux';
import { useEffect } from 'react';
import { RootState } from '../../../app/store';
import { 
  selectAdmin, 
  selectIsAuthenticated, 
  selectAdminLoading, 
  selectAdminError,
  clearAdmin,
  initializeAuth 
} from '../services/adminSlice';

export const useAdminAuth = () => {
  const dispatch = useDispatch();
  
  const admin = useSelector((state: RootState) => selectAdmin(state));
  const isAuthenticated = useSelector((state: RootState) => selectIsAuthenticated(state));
  const isLoading = useSelector((state: RootState) => selectAdminLoading(state));
  const error = useSelector((state: RootState) => selectAdminError(state));

  // Initialize auth state from localStorage on hook mount
  useEffect(() => {
    dispatch(initializeAuth());
  }, [dispatch]);

  const logout = () => {
    dispatch(clearAdmin());
  };

  return {
    admin,
    isAuthenticated,
    isLoading,
    error,
    logout,
  };
};
