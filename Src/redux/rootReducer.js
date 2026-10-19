import { combineReducers } from 'redux';
import gameSlice from './reducers/gameSlice';
import onlineSlice from './onlineSlice';
import profileSlice from './profileSlice';

const rootReducer = combineReducers({
  game: gameSlice,
  online: onlineSlice,
  profile: profileSlice,
});
export default rootReducer;
