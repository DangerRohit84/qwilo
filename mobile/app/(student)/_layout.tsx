import { Stack } from "expo-router";

export default function StudentLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="homework-upload" />
      <Stack.Screen name="tasks/[id]" />
      <Stack.Screen name="tasks/[id]/questions" />
      <Stack.Screen name="progress" />
    </Stack>
  );
}
