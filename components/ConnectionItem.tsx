"use client"

import React from "react"
import { View, Text, StyleSheet, Alert } from "react-native"
import { useRouter } from "expo-router"
import UserAvatar from "./UserAvatar"
import Button from "./ui/Button"
import Colors from "../constants/Colors"
import { contactsApi, chatsApi } from "../services/index" // You might not need chatsApi anymore
import { useMessages } from "../context/MessageContext" // Import the context

type ConnectionItemProps = {
  connection: any
  type: "accepted" | "pending" | "sent"
  onAccept?: () => void
  onReject?: () => void
  onRemove?: () => void
  onCancel?: () => void
  onPress?: () => void
  onAction?: () => void
  currentUserId: string
}

const ConnectionItem: React.FC<ConnectionItemProps> = ({
  connection,
  type,
  onAction,
  currentUserId,
}) => {
  const router = useRouter()
  const { initiateChat } = useMessages() // Use the context

  const getUserData = () => {
    if (!connection) {
      console.warn("Connection is null or undefined")
      return null
    }

    switch (type) {
      case "sent":
        return connection.recipient
      case "pending":
        return connection.requester
      case "accepted":
        if (!connection.requester || !connection.recipient) {
          console.warn("Requester or recipient is null")
          return null
        }
        return connection.requester._id === currentUserId
          ? connection.recipient
          : connection.requester
      default:
        return null
    }
  }

  const user = getUserData()
  const isOnline = user?.isOnline || false

  if (!user) {
    return null
  }

  const handleAccept = async () => {
    try {
      if (!connection?._id) {
        Alert.alert("Error", "Connection ID is missing.")
        return
      }
      await contactsApi.respondToRequest(connection._id, "accept")
      if (onAction) onAction()
    } catch (error) {
      Alert.alert("Error", "Failed to accept connection request")
    }
  }

  const handleReject = async () => {
    try {
      if (!connection?._id) {
        Alert.alert("Error", "Connection ID is missing.")
        return
      }
      await contactsApi.respondToRequest(connection._id, "reject")
      if (onAction) onAction()
    } catch (error) {
      Alert.alert("Error", "Failed to reject connection request")
    }
  }

  const handleRemove = async () => {
    Alert.alert("Remove Connection", "Are you sure you want to remove this connection?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            if (!connection?._id) {
              Alert.alert("Error", "Connection ID is missing.")
              return
            }
            await contactsApi.removeConnection(connection._id)
            if (onAction) onAction()
          } catch (error) {
            Alert.alert("Error", "Failed to remove connection")
          }
        },
      },
    ])
  }

  const handleStartChat = async () => {
    try {
      if (!user?._id) {
        Alert.alert("Error", "User ID is missing.")
        return
      }

      const chat = await initiateChat(user, "online") // Use initiateChat from context
      console.log("Chat after initiateChat:", chat)

      if (chat && chat.id) { // Use chat.id
        const route = `/(protected)/(tabs)/chat/${chat.id}`
        console.log("Navigating to route:", route)
        router.push(route)
      } else {
        Alert.alert("Error", "Failed to initiate or retrieve chat.")
      }
    } catch (error: any) {
      console.error("Error starting chat:", error)
      Alert.alert("Error", error.message || "Failed to start chat")
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.userInfo}>
        <UserAvatar
          uri={user?.avatar}
          name={user?.username}
          size={50}
          showStatus={type === "accepted"}
          isOnline={isOnline}
        />

        <View style={styles.userDetails}>
          <Text style={styles.username}>{user?.username}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        {type === "accepted" && (
          <View style={styles.buttonGroup}>
            <Button
              title="Chat"
              onPress={handleStartChat}
              variant="primary"
              size="small"
              style={styles.actionButton}
            />
            <Button
              title="Remove"
              onPress={handleRemove}
              variant="outline"
              size="small"
              style={styles.actionButton}
            />
          </View>
        )}

        {type === "pending" && (
          <View style={styles.buttonGroup}>
            <Button
              title="Accept"
              onPress={handleAccept}
              variant="primary"
              size="small"
              style={styles.actionButton}
            />
            <Button
              title="Reject"
              onPress={handleReject}
              variant="outline"
              size="small"
              style={styles.actionButton}
            />
          </View>
        )}

        {type === "sent" && <Text style={styles.pendingText}>Request Sent</Text>}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.common.gray[200],
    backgroundColor: Colors.common.white,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  userDetails: {
    marginLeft: 12,
  },
  username: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.common.gray[900],
  },
  email: {
    fontSize: 14,
    color: Colors.common.gray[500],
  },
  actions: {
    alignItems: "flex-end",
  },
  buttonGroup: {
    flexDirection: "row",
  },
  actionButton: {
    marginLeft: 8,
    minWidth: 80,
  },
  pendingText: {
    fontSize: 14,
    color: Colors.connection.pending,
    fontStyle: "italic",
  },
  errorText: {
    fontSize: 14,
    color: "red",
  },
})

export default ConnectionItem
