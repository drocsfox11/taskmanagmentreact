import { createAction } from '@reduxjs/toolkit';

export const fetchProjectsRequest = createAction('projects/fetchProjectsRequest');
export const createProjectRequest = createAction('projects/createProjectRequest'); // payload: {name, description, participants}
export const updateProjectRequest = createAction('projects/updateProjectRequest'); // payload: {id, ...fields}
export const deleteProjectRequest = createAction('projects/deleteProjectRequest'); // payload: id 