import { StyleSheet, View } from 'react-native';
import React, { useMemo, memo } from 'react';
import Cell from './Cell';

const VerticalPath = ({ cells, color }) => {
  const groupedCells = useMemo(() => {
    const groups = [];
    for (let i = 0; i < cells.length; i += 3) {
      groups.push(cells.slice(i, i + 3));
    }
    return groups;
  }, [cells]);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {groupedCells.map((group, groupIndex) => (
          <View key={`group-${groupIndex}`} style={styles.row}>
            {group.map((id, index) => (
              <Cell
                key={`cell-${id}`}
                cell={true}
                id={id}
                color={color}
                index={index}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '20%',
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
    width: '33.3%',
    height: '16.7%',
  },
});

export default memo(VerticalPath)
