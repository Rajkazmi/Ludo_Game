import {
  Alert,
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Modal from 'react-native-modal';
import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { resetGame } from '../redux/reducers/gameSlice';
import { playSound } from '../helpers/SoundUtility';
import { goBack, resetAndNavigate } from '../helpers/NavigationUtil';
import LinearGradient from 'react-native-linear-gradient';
import GradientButton from './GradientButton';
import { useSelector } from 'react-redux';
import { clearOnlineRoom } from '../redux/onlineSlice';
import { removeRoom, sendRoomAction } from '../services/OnlineGameService';

const MenuModal = ({ onPressHide, visible }) => {

  const dispatch = useDispatch();
  const online = useSelector(state => state.online);

  const handleNewGame = useCallback(async () => {
    if (online.roomCode && !online.isHost) {
      try {
        await sendRoomAction(online.roomCode, { type: 'newGame' });
      } catch (error) {
        Alert.alert('Unable to start a new game', error.message);
      }
      onPressHide();
      return;
    }
    dispatch(
      resetGame(
        online.roomCode ? { activePlayers: online.activePlayers } : undefined,
      ),
    );
    playSound('game_start');
    onPressHide();
  }, [dispatch, onPressHide, online]);

  const handleHome = useCallback(async () => {
    if (online.roomCode) {
      try {
        if (online.isHost) {
          await removeRoom(online.roomCode);
        } else {
          await sendRoomAction(online.roomCode, { type: 'leave' });
        }
      } catch (error) {
        Alert.alert('Unable to leave the online room', error.message);
        return;
      }
      dispatch(clearOnlineRoom());
      dispatch(resetGame());
      resetAndNavigate('HomeScreen');
      return;
    }
    goBack();
  }, [dispatch, online]);

  return (
    <Modal
      style={styles.bottomModalView}
      isVisible={visible}
      backdropColor="black"
      backdropOpacity={0.8}
      onBackdropPress={onPressHide}
      animationIn="zoomIn"
      animationOut="zoomOut"
      onBackButtonPress={onPressHide}>
       
    
      <View style={styles.backdrop}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onPressHide} />
        <View style={styles.modalContainer}>
          <LinearGradient
            colors={['#0f0c29', '#302b63', '#242434']}
            style={styles.gradientContainer}
          >
            <View style={styles.subView}>
              <GradientButton title="RESUME" onPress={onPressHide} />
              <GradientButton title="NEW GAME" onPress={handleNewGame} />
              <GradientButton title="HOME" onPress={handleHome} />
            </View>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  gradientContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    width: '96%',
    borderWidth: 2,
    borderColor: 'gold',
    justifyContent: 'center',
    alignItems: 'center',
  },
  subView: {
    width: '100%',
    marginVertical: 20,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomModalView: {
    justifyContent:'center',
    width:'95%',
    alignSelf: 'center',
  },
//   flex: 1,
  //   backgroundColor: 'rgba(0, 0, 0, 0.7)',
  //   justifyContent: 'center',
  //   alignItems: 'center',
  // },
  // overlay: {
  //   ...StyleSheet.absoluteFillObject,
  // },
  modalContainer: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
export default MenuModal;
