import {
    FETCH_TAGS_REQUEST,
    FETCH_TAGS_SUCCESS,
    FETCH_TAGS_FAILURE,
    FETCH_BOARD_TAGS_REQUEST,
    FETCH_BOARD_TAGS_SUCCESS,
    FETCH_BOARD_TAGS_FAILURE
} from './tagsActions';

const initialState = {
    tags: [],
    boardTags: [],
    loading: false,
    error: null
};

const tagsReducer = (state = initialState, action) => {
    switch (action.type) {
        case FETCH_TAGS_REQUEST:
            return {
                ...state,
                loading: true,
                error: null
            };
        case FETCH_TAGS_SUCCESS:
            return {
                ...state,
                tags: action.payload,
                loading: false,
                error: null
            };
        case FETCH_TAGS_FAILURE:
            return {
                ...state,
                loading: false,
                error: action.payload
            };
        case FETCH_BOARD_TAGS_REQUEST:
            return {
                ...state,
                loading: true,
                error: null
            };
        case FETCH_BOARD_TAGS_SUCCESS:
            return {
                ...state,
                boardTags: action.payload,
                loading: false,
                error: null
            };
        case FETCH_BOARD_TAGS_FAILURE:
            return {
                ...state,
                loading: false,
                error: action.payload
            };
        default:
            return state;
    }
};

export default tagsReducer; 