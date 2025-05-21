import actionTypes from "./actionTypes";

const initialState = {
  user: {},
  mobileView: false,
  room: {},
  joiningRoom: "",
  songUploadedTimestamp: "",
  banner: {},
  theme: "light",
};

const rootReducer = (state = initialState, action) => {
  switch (action.type) {
    case actionTypes.NEW_SONG_UPLOADED: {
      return { ...state, songUploadedTimestamp: Date.now() };
    }
    case actionTypes.UPDATE_BANNER: {
      return {
        ...state,
        banner: typeof action.banner ? { ...action.banner } : {},
      };
    }
    case actionTypes.DELETE_BANNER: {
      return {
        ...state,
        banner: {},
      };
    }
    case actionTypes.JOINING_ROOM: {
      return { ...state, joiningRoom: action.roomId };
    }
    case actionTypes.ADD_ROOM: {
      return { ...state, room: { ...action.room }, joiningRoom: "" };
    }
    case actionTypes.UPDATE_ROOM: {
      return { ...state, room: { ...state.room, ...action.room } };
    }
    case actionTypes.DELETE_ROOM: {
      return { ...state, room: {} };
    }
    case actionTypes.USER_LOGIN: {
      return { ...state, user: { ...action.user } };
    }
    case actionTypes.USER_LOGOUT: {
      return { user: {} };
    }
    case actionTypes.SET_MOBILE_VIEW: {
      return { ...state, mobileView: action.isMobileView ? true : false };
    }
    case actionTypes.SET_THEME: {
      return { ...state, theme: action.theme };
    }

    default:
      return state;
  }
};

export default rootReducer;
