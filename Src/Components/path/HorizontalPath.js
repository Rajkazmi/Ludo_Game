import { StyleSheet, View } from 'react-native';
import React, { useMemo } from 'react';
import Cell from './Cell';

const HorizontalPath = React.memo(({ cells, color }) => {
  const groupedCells = useMemo(() => {
    const groups = [];
    for (let i = 0; i < cells.length; i += 6) {
      groups.push(cells.slice(i, i + 6));
    }
    return groups;
  }, [cells]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {groupedCells.map((group, groupIndex) => (
          <View key={`group-${groupIndex}`} style={styles.row}>
            {group.map(id => (
              <Cell key={`cell-${id}`} cell={true} id={id} color={color} />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '40%',
    height: '100%',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'column',
    width: '100%',
    height: '100%',
  },
  row: {
    flexDirection: 'row',
    width: '16.7%',
    height: '33.7%',
  },
});

export default HorizontalPath;
