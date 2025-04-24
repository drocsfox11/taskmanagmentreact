import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  byId: {},
  allIds: []
};

const columnsSlice = createSlice({
  name: 'columns',
  initialState,
  reducers: {
    setColumns: (state, action) => {
      const columns = action.payload;
      state.byId = columns.reduce((acc, column) => {
        acc[column.id] = column;
        return acc;
      }, {});
      state.allIds = columns.map(column => column.id);
    },
    addColumn: (state, action) => {
      const column = action.payload;
      state.byId[column.id] = column;
      state.allIds.push(column.id);
    },
    updateColumn: (state, action) => {
      const { id, ...updates } = action.payload;
      if (state.byId[id]) {
        state.byId[id] = { ...state.byId[id], ...updates };
      }
    },
    deleteColumn: (state, action) => {
      const id = action.payload;
      delete state.byId[id];
      state.allIds = state.allIds.filter(columnId => columnId !== id);
    },
    reorderColumns: (state, action) => {
      const { sourceIndex, destinationIndex } = action.payload;
      const [removed] = state.allIds.splice(sourceIndex, 1);
      state.allIds.splice(destinationIndex, 0, removed);
    }
  }
});

export const { setColumns, addColumn, updateColumn, deleteColumn, reorderColumns } = columnsSlice.actions;
export default columnsSlice.reducer; 