import { combineReducers } from 'redux';
import gameSlice from './reducers/gameSlice';
import onlineSlice from './onlineSlice';

const rootReducer = combineReducers({
  game: gameSlice,
  online: onlineSlice,
});
export default rootReducer;
