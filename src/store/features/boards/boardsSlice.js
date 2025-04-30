import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  byId: {},
  allIds: [],
};

const boardsSlice = createSlice({
  name: 'boards',
  initialState,
  reducers: {
    setBoards: (state, action) => {
      const boards = action.payload;
      state.byId = boards.reduce((acc, board) => {
        acc[board.id] = board;
        return acc;
      }, {});
      state.allIds = boards.map(board => board.id);
    },
    addBoard: (state, action) => {
      const board = action.payload;
      state.byId[board.id] = board;
      if (!state.allIds.includes(board.id)) {
        state.allIds.push(board.id);
      }
    },
    updateBoard: (state, action) => {
      const { id, ...updates } = action.payload;
      if (state.byId[id]) {
        state.byId[id] = { ...state.byId[id], ...updates };
      }
    },
    deleteBoard: (state, action) => {
      const id = action.payload;
      delete state.byId[id];
      state.allIds = state.allIds.filter(boardId => boardId !== id);
    },
    removeBoardsByProjectId: (state, action) => {
      const projectId = action.payload;
      state.allIds = state.allIds.filter(boardId => {
        if (state.byId[boardId]?.projectId === projectId) {
          delete state.byId[boardId];
          return false;
        }
        return true;
      });
    },
  },
});

export const { setBoards, addBoard, updateBoard, deleteBoard, removeBoardsByProjectId } = boardsSlice.actions;
export default boardsSlice.reducer; 