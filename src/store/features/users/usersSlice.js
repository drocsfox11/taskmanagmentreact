import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  byId: {},
  allIds: [],
  byUsername: {}
};

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    setUsers: (state, action) => {
      const users = action.payload;
      state.byId = users.reduce((acc, user) => {
        acc[user.id] = user;
        return acc;
      }, {});
      state.allIds = users.map(user => user.id);
    },
    addUser: (state, action) => {
      const user = action.payload;
      state.byId[user.id] = user;
      state.allIds.push(user.id);
    },
    updateUser: (state, action) => {
      const { id, ...updates } = action.payload;
      if (state.byId[id]) {
        state.byId[id] = { ...state.byId[id], ...updates };
      }
    },
    deleteUser: (state, action) => {
      const id = action.payload;
      delete state.byId[id];
      state.allIds = state.allIds.filter(userId => userId !== id);
    },
    setUser: (state, action) => {
      const user = action.payload;
      state.byUsername[user.username] = user;
    }
  }
});

export const { setUsers, addUser, updateUser, deleteUser, setUser } = usersSlice.actions;
export default usersSlice.reducer; 