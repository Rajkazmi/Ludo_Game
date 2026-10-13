import { View, StyleSheet } from 'react-native';
import React from 'react';
import { useDispatch } from 'react-redux';
import { Colors } from '../constants/Colors';
import Pile from './Pile';
import { handleStartPieceThunk } from '../redux/reducers/gameAction';

const Pocket = ({ color, player, data }) => {
  const dispatch = useDispatch();
  const handlePress = value => {
    dispatch(handleStartPieceThunk(player, value.id));
  };
  return (
    <View style={[styles.container, { backgroundColor: color }]}>
      <View style={styles.childFrame}>
        <View style={styles.flexRow}>
          <Plot
            pieceNo={0}
            player={player}
            color={color}
            data={data}
            handlePress={handlePress}
          />
          <Plot
            pieceNo={1}
            player={player}
            color={color}
            data={data}
            handlePress={handlePress}
          />
        </View>
        <View style={[styles.flexRow, styles.secondRow]}>
          <Plot
            pieceNo={2}
            player={player}
            color={color}
            data={data}
            handlePress={handlePress}
          />
          <Plot
            pieceNo={3}
            player={player}
            color={color}
            data={data}
            handlePress={handlePress}
          />
        </View>
      </View>
    </View>
  );
};

const Plot = ({ pieceNo, player, color, data, handlePress }) => {
  return (
    <View style={[styles.plot, { backgroundColor: color }]}>
      {data && data[pieceNo]?.pos === 0 && (
        <Pile
          player={player}
          color={color}
          //pieceId={data[pieceNo]?.id}
          onPress={() => {
            handlePress(data[pieceNo]);
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 0.4,
    justifyContent: 'center',
    alignItems: 'center',
    width: '40%',
    height: '100%',
    borderColor: Colors.borderColor,
  },
  childFrame: {
    backgroundColor: 'white',
    borderWidth: 0.4,
    padding: 15,
    width: '70%',
    height: '70%',
    borderColor: Colors.borderColor,
  },
  flexRow: {
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    height: '40%',
    flexDirection: 'row',
  },
  secondRow: {
    marginTop: 20,
  },
  plot: {
    backgroundColor: Colors.green,
    width: '36%',
    height: '80%',
    borderRadius: 50,
  },
});

export default React.memo(Pocket);
