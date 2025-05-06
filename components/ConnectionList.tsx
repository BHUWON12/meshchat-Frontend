import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import ConnectionItem from './ConnectionItem';

type ConnectionListProps = {
  connections?: any[]; // can be undefined/null
  type: 'accepted' | 'pending' | 'sent';
  currentUserId: string;
  onAction?: () => void;
};

const ConnectionList: React.FC<ConnectionListProps> = ({
  connections = [],
  type,
  currentUserId,
  onAction,
}) => {
  // Always use array for filter/map
  const validConnections = (Array.isArray(connections) ? connections : []).filter(conn => !!conn);

  let emptyMessage = '';
  if (type === 'sent') emptyMessage = 'No sent requests';
  else if (type === 'pending') emptyMessage = 'No pending requests';
  else if (type === 'accepted') emptyMessage = 'No connections';

  return (
    <View style={{ flex: 1 }}>
      {validConnections.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{emptyMessage}</Text>
        </View>
      ) : (
        <FlatList
          data={validConnections}
          keyExtractor={item => item._id}
          renderItem={({ item }) => (
            <ConnectionItem
              connection={item}
              type={type}
              currentUserId={currentUserId}
              onAction={onAction}
            />
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
    fontStyle: 'italic',
  },
});

export default ConnectionList;
