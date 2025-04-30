import { createAction } from '@reduxjs/toolkit';

export const fetchColumnsByBoardRequest = createAction('columns/fetchColumnsByBoardRequest');
export const fetchColumnsByBoardSuccess = createAction('columns/fetchColumnsByBoardSuccess');
export const fetchColumnsByBoardFailure = createAction('columns/fetchColumnsByBoardFailure');

export const createColumnRequest = createAction('columns/createColumnRequest');
export const createColumnSuccess = createAction('columns/createColumnSuccess');
export const createColumnFailure = createAction('columns/createColumnFailure');

export const updateColumnRequest = createAction('columns/updateColumnRequest');
export const updateColumnSuccess = createAction('columns/updateColumnSuccess');
export const updateColumnFailure = createAction('columns/updateColumnFailure');

export const deleteColumnRequest = createAction('columns/deleteColumnRequest');
export const deleteColumnSuccess = createAction('columns/deleteColumnSuccess');
export const deleteColumnFailure = createAction('columns/deleteColumnFailure');

export const reorderColumnsRequest = createAction('columns/reorderColumnsRequest');

// Экшены reorderColumnsOptimistic и resetColumnsOrder импортируются из slice 