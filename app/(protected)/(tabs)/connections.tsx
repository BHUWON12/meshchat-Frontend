"use client"

import { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Keyboard, // Import Keyboard
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { Search, X, ArrowLeft } from "lucide-react-native"
import { useRouter } from "expo-router"

// FIX: Correctly import contacts from services/contacts
import { contacts } from "../../../services/contacts" // Import from the index file

import { useAuth } from "../../../context/AuthContext" // Adjust the import path based on your project structure
import Colors from "../../../constants/Colors" // Adjust the import path based on your project structure
// FIX: Adjust component import paths based on the previous refactoring suggestion
import EmptyState from "../../../components/EmptyState" // Assuming this component is in the common folder
import ConnectionItem from "../../../components/ConnectionItem" // Assuming this component is here now

import { debounce } from "../../../utils/helpers" // Assuming debounce is correctly implemented here

// Define the expected structure of connections from the backend
interface ConnectionsData {
  accepted: any[] // You might want to define a more specific type for connection items
  pendingReceived: any[]
  pendingSent: any[]
}

export default function ConnectionsScreen() {
  const { user } = useAuth()
  const router = useRouter()

  const [connections, setConnections] = useState<ConnectionsData>({
    accepted: [],
    pendingReceived: [],
    pendingSent: [],
  })

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchMode, setSearchMode] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([]) // Define type for search results
  const [searching, setSearching] = useState(false)

  // Fetch connections - assuming contactsApi.getConnections now returns ConnectionsData directly
  // based on how you set the state previously (setConnections(response.data.data))
  // If your service function currently returns Promise<User[]>, you will need to modify the service
  // function to return the structured ConnectionsData object from your backend response.
  const fetchConnections = async () => {
    try {
      console.log("Fetching connections...") // Debugging
      setLoading(true)

      // Assuming contacts.getConnections service function correctly fetches
      // from the backend endpoint and returns the data object with
      // accepted, pendingReceived, and pendingSent arrays.
      // Based on the JSON you provided, the service function should return
      // the object that contains these three arrays.
      const connectionsData = await contacts.getConnections() // Get the data object

      console.log("Connections data received from service:", connectionsData) // Log the received object

      // *** CORRECTED LOGIC HERE ***
      // Set the state using the arrays from the received data object
      const structuredConnections: ConnectionsData = {
        accepted: connectionsData.accepted || [], // Use the accepted array from the data
        pendingReceived: connectionsData.pendingReceived || [], // Use the pendingReceived array
        pendingSent: connectionsData.pendingSent || [], // Use the pendingSent array
      }

      console.log("Setting connections state to:", structuredConnections) // Debugging

      setConnections(structuredConnections) // Set the state with the structured object
    } catch (error) {
      console.error("Error fetching connections:", error)
      // Clear state and show error if fetching fails
      setConnections({ accepted: [], pendingReceived: [], pendingSent: [] })
      // Optionally show an alert to the user here
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    // console.log("Refreshing connections..."); // Debugging
    setRefreshing(true)
    await fetchConnections()
    // fetchConnections already handles setting refreshing to false
  }

  useEffect(() => {
    fetchConnections()
    // Add user dependency if fetching connections depends on user ID
  }, [user]) // Added user dependency

  // Debounced search function - assuming contactsApi.searchUsersByEmail returns User[]
  const searchUsers = debounce(async (query: string) => {
    if (!query || query.length < 3) {
      setSearchResults([])
      setSearching(false)
      return
    }

    // console.log(`Searching for users with query: ${query}`); // Debugging
    try {
      setSearching(true)
      // FIX: Use contacts.searchUsers from the correct import
      const searchUsersResult = await contacts.searchUsers(query)
      // console.log("Search results:", searchUsersResult); // Debugging
      // Assuming searchUsers returns the array of users directly
      setSearchResults(searchUsersResult || [])
    } catch (error) {
      console.error("Error searching users:", error)
      // Optionally set an error state for search
      setSearchResults([]) // Clear results on error
    } finally {
      setSearching(false)
    }
  }, 500) // 500ms debounce delay

  const handleSearch = (text: string) => {
    setSearchQuery(text)
    // Trigger the debounced search function
    searchUsers(text)
  }

  const handleSendRequest = async (userId: string) => {
    if (!user) {
      console.warn("User not authenticated, cannot send request.")
      return
    }
    // console.log(`Sending connection request to user ID: ${userId}`); // Debugging
    try {
      // FIX: Use contacts.sendRequest
      await contacts.sendRequest(userId) // Use the correct function name from your exports

      // Optional: Show a success message (e.g., Toast notification)

      // Refresh connections after sending request to update lists
      // console.log("Request sent, refreshing connections..."); // Debugging
      fetchConnections()

      // Clear search state
      setSearchQuery("")
      setSearchResults([])
      setSearchMode(false) // Exit search mode after sending request
      Keyboard.dismiss() // Dismiss keyboard
    } catch (error) {
      console.error("Error sending connection request:", error)
      // Optionally display an error to the user
    }
  }

  // Function to handle accepting/rejecting pending requests
  const handleRespondToRequest = async (requestId: string, action: "accept" | "reject") => {
    // console.log(`Responding to request ${requestId} with action: ${action}`); // Debugging
    try {
      await contacts.respondToRequest(requestId, action)
      // Refresh connections after responding
      fetchConnections()
    } catch (error) {
      console.error(`Error responding to request ${requestId}:`, error)
    }
  }

  // Function to handle removing a connection or canceling a sent request
  const handleRemoveOrCancel = async (connectionId: string, type: "accepted" | "sent", userId?: string) => {
    // console.log(`Handling remove/cancel for ID: ${connectionId}, type: ${type}`); // Debugging
    try {
      if (type === "accepted") {
        await contacts.removeConnection(connectionId)
      } else if (type === "sent" && userId) {
        // Assuming cancelRequest takes the recipient's user ID
        await contacts.removeConnection(userId)
      } else {
        console.warn("Invalid type or missing user ID for remove/cancel action")
        return
      }
      // Refresh connections after action
      fetchConnections()
    } catch (error) {
      console.error(`Error performing remove/cancel action for ${connectionId}:`, error)
    }
  }

  const toggleSearchMode = () => {
    // console.log("Toggling search mode. Current:", searchMode); // Debugging
    setSearchMode(!searchMode)
    // Clear search state when exiting search mode
    if (searchMode) {
      // If we are exiting search mode
      setSearchQuery("")
      setSearchResults([])
      Keyboard.dismiss() // Dismiss keyboard
    } else {
      // If we are entering search mode
      // Optionally focus the input field here
    }
  }

  const renderHeader = () => (
    <View style={styles.header}>
      {searchMode ? (
        <View style={styles.searchContainer}>
          <TouchableOpacity onPress={toggleSearchMode} style={{ padding: 4 }}>
            <ArrowLeft size={24} color={Colors.common.gray[500]} /> {/* Use ArrowLeft for back in search */}
          </TouchableOpacity>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by email..."
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
            keyboardType="email-address"
            autoFocus // Automatically focus when entering search mode
            placeholderTextColor={Colors.common.gray[500]} // Optional: placeholder color
          />
          {/* Optional: Clear button when there's text */}
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")} style={{ padding: 4 }}>
              <X size={20} color={Colors.common.gray[500]} />
            </TouchableOpacity>
          )}
          {/* Show Search icon if no text and not showing X */}
          {searchQuery.length === 0 && !searching && (
            <Search size={20} color={Colors.common.gray[500]} style={{ padding: 4 }} />
          )}
          {/* Show loading indicator while searching */}
          {searching && <ActivityIndicator size="small" color={Colors.common.gray[500]} style={{ padding: 4 }} />}
        </View>
      ) : (
        <>
          <Text style={styles.title}>Connections</Text>
          <TouchableOpacity style={styles.searchButton} onPress={toggleSearchMode}>
            <Search size={24} color={Colors.common.gray[700]} />
          </TouchableOpacity>
        </>
      )}
    </View>
  )

  const renderSearchResults = () => {
    // console.log("Rendering search results. Searching:", searching, " Results count:", searchResults.length); // Debugging
    if (searching && searchQuery.length >= 3) {
      return (
        <View style={styles.searchingContainer}>
          <ActivityIndicator size="large" color={Colors.primary[500]} />
        </View>
      )
    }

    if (searchQuery.length < 3) {
      return (
        <View style={styles.searchStatusContainer}>
          <Text style={styles.searchHint}>Enter at least 3 characters to search users by email.</Text>
        </View>
      )
    }

    if (searchResults.length === 0) {
      return (
        <View style={styles.searchStatusContainer}>
          <Text style={styles.noResults}>No users found matching "{searchQuery}"</Text>
        </View>
      )
    }

    // Render results list
    return (
      <FlatList
        data={searchResults}
        keyExtractor={(item) => item._id || item.id} // Use unique ID
        renderItem={({ item }) => (
          <View style={styles.searchResult}>
            {" "}
            {/* Use a separate style for list items */}
            <View style={styles.userInfo}>
              {/* You might want to add UserAvatar here */}
              <Text style={styles.username}>{item.username}</Text>
              <Text style={styles.email}>{item.email}</Text>
            </View>
            {/* Add logic here to check if a request is already pending or accepted */}
            {/* For now, just show the connect button */}
            <TouchableOpacity style={styles.connectButton} onPress={() => handleSendRequest(item._id || item.id)}>
              <Text style={styles.connectButtonText}>Connect</Text>
            </TouchableOpacity>
          </View>
        )}
        contentContainerStyle={styles.searchResultsList} // Style for the list container
      />
    )
  }

  const renderConnectionsList = () => {
    // This function is now simplified as renderSearchResults handles the search view

    const allEmpty =
      connections.accepted.length === 0 &&
      connections.pendingReceived.length === 0 &&
      connections.pendingSent.length === 0

    if (loading && !refreshing) {
      // Show full screen loading only on initial load
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary[500]} />
        </View>
      )
    }

    if (allEmpty && !loading) {
      // Only show empty state if not loading and all lists are empty
      return (
        <EmptyState
          type="connections"
          onAction={toggleSearchMode} // Action is to go to search mode
          actionLabel="Search Friends"
        />
      )
    }

    // Render the lists using FlatList or multiple Views/Maps
    // Using FlatList for efficiency is better if lists are long, but requires combining data
    // For simplicity, using Maps within a ScrollView or a single FlatList with different item types is common.
    // Given the structure, using Maps within a ScrollView or a single FlatList with header components is fine for moderate list sizes.
    // Let's stick to the original structure using Maps within a parent View for clarity.

    return (
      <FlatList // Using FlatList primarily for the RefreshControl
        data={[]} // Data is empty, content is in ListHeaderComponent
        renderItem={null} // No items rendered by default
        ListHeaderComponent={
          // Render the sections as the header
          <>
            {connections.pendingReceived.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Pending Requests</Text>
                {connections.pendingReceived.map((connection) => (
                  <ConnectionItem
                    key={connection._id || connection.id}
                    connection={connection}
                    type="pending"
                    onAccept={() => handleRespondToRequest(connection._id || connection.id, "accept")}
                    onReject={() => handleRespondToRequest(connection._id || connection.id, "reject")}
                    currentUserId={user?._id || ""}
                  />
                ))}
              </View>
            )}

            {connections.accepted.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Connected</Text>
                {connections.accepted.map((connection) => (
                  <ConnectionItem
                    key={connection._id || connection.id}
                    connection={connection}
                    type="accepted"
                    // Pass action handlers down to the ConnectionItem
                    onRemove={() => handleRemoveOrCancel(connection._id || connection.id, "accepted")}
                    onPress={() => router.push(`/chat/${connection.chatId}`)}
                    currentUserId={user?._id || ""}
                  />
                ))}
              </View>
            )}

            {connections.pendingSent.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Sent Requests</Text>
                {connections.pendingSent.map((connection) => (
                  <ConnectionItem
                    key={connection._id || connection.id}
                    connection={connection}
                    type="sent"
                    // Pass action handlers down to the ConnectionItem
                    onCancel={() =>
                      handleRemoveOrCancel(
                        connection._id || connection.id,
                        "sent",
                        connection.recipient?._id || connection.recipient?.id,
                      )
                    } // Assuming recipient ID is needed to cancel
                    currentUserId={user?._id || ""}
                  />
                ))}
              </View>
            )}
          </>
        }
        contentContainerStyle={styles.connectionsListContent} // Style for the list content
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary[500]]}
            tintColor={Colors.primary[500]}
          />
        }
      />
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {renderHeader()}

      {/* Conditionally render search results or connections lists */}
      {searchMode ? renderSearchResults() : renderConnectionsList()}
    </SafeAreaView>
  )
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.common.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.common.gray[200],
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.common.gray[900],
    fontFamily: "Poppins-Bold",
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.common.gray[100],
    alignItems: "center",
    justifyContent: "center",
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.common.gray[100],
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: Colors.common.gray[900],
    fontFamily: "Inter-Regular",
  },
  section: {
    marginTop: 16,
    backgroundColor: Colors.light.background,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.common.gray[700],
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontFamily: "Inter-SemiBold",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  searchResult: {
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
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.common.gray[900],
    fontFamily: "Inter-SemiBold",
  },
  email: {
    fontSize: 14,
    color: Colors.common.gray[500],
    fontFamily: "Inter-Regular",
  },
  connectButton: {
    backgroundColor: Colors.primary[500],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  connectButtonText: {
    color: Colors.common.white,
    fontWeight: "600",
    fontSize: 14,
    fontFamily: "Inter-SemiBold",
  },
  noResults: {
    textAlign: "center",
    fontSize: 16,
    color: Colors.common.gray[600],
    marginTop: 20,
    fontFamily: "Inter-Regular",
  },
  searchHint: {
    textAlign: "center",
    fontSize: 14,
    color: Colors.common.gray[500],
    marginTop: 20,
    fontFamily: "Inter-Regular",
  },
  searchingIndicator: {
    marginTop: 20,
  },
  connectionsListContent: {
    paddingBottom: 20, // Example: Add some padding at the bottom
  },
  searchingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  searchStatusContainer: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: "center",
  },
  searchResultsList: {
    paddingBottom: 20,
  },
})
