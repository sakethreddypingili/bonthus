// Example Supabase integration functions for admin dashboard
// You can use these functions throughout your admin panel components

import { supabase } from './supabase';

// User management functions
export const getUserData = async () => {
  try {
    const { data, error } = await supabase
      .from('user_data')
      .select('*');
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching user data:', error);
    return { data: null, error };
  }
};

export const getUserById = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('user_data')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching user:', error);
    return { data: null, error };
  }
};

export const updateUser = async (userId, updates) => {
  try {
    const { data, error } = await supabase
      .from('user_data')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error updating user:', error);
    return { data: null, error };
  }
};

export const deleteUser = async (userId) => {
  try {
    const { error } = await supabase
      .from('user_data')
      .delete()
      .eq('id', userId);
    
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error deleting user:', error);
    return { error };
  }
};

// Authentication functions
export const signIn = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error signing in:', error);
    return { data: null, error };
  }
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Error signing out:', error);
    return { error };
  }
};

export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return { user, error: null };
  } catch (error) {
    console.error('Error getting current user:', error);
    return { user: null, error };
  }
};

// Real-time subscription example
export const subscribeToUserChanges = (callback) => {
  const subscription = supabase
    .channel('user_data_changes')
    .on(
      'postgres_changes',
      { 
        event: '*', 
        schema: 'public', 
        table: 'user_data' 
      },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();

  return subscription;
};

// Unsubscribe from real-time updates
export const unsubscribe = (subscription) => {
  if (subscription) {
    supabase.removeChannel(subscription);
  }
};
