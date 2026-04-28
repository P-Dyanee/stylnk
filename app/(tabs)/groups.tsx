import { StyleSheet, Text, View } from "react-native";
import { Colors } from "../../constants/theme";

export default function GroupsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Groups</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background, padding: 16 },
  title: { fontSize: 24, fontWeight: "bold", color: Colors.light.text },
});
