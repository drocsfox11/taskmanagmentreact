export const FETCH_TAGS_REQUEST = 'tags/fetchTagsRequest';
export const FETCH_TAGS_SUCCESS = 'tags/fetchTagsSuccess';
export const FETCH_TAGS_FAILURE = 'tags/fetchTagsFailure';
export const FETCH_BOARD_TAGS_REQUEST = 'tags/fetchBoardTagsRequest';
export const FETCH_BOARD_TAGS_SUCCESS = 'tags/fetchBoardTagsSuccess';
export const FETCH_BOARD_TAGS_FAILURE = 'tags/fetchBoardTagsFailure';

export const fetchTagsRequest = (boardId) => ({
    type: FETCH_TAGS_REQUEST,
    payload: boardId
});

export const fetchTagsSuccess = (tags) => ({
    type: FETCH_TAGS_SUCCESS,
    payload: tags
});

export const fetchTagsFailure = (error) => ({
    type: FETCH_TAGS_FAILURE,
    payload: error
});

export const fetchBoardTagsRequest = (boardId) => ({
    type: FETCH_BOARD_TAGS_REQUEST,
    payload: boardId
});

export const fetchBoardTagsSuccess = (tags) => ({
    type: FETCH_BOARD_TAGS_SUCCESS,
    payload: tags
});

export const fetchBoardTagsFailure = (error) => ({
    type: FETCH_BOARD_TAGS_FAILURE,
    payload: error
}); 