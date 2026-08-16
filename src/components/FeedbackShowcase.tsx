import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Dimensions } from "react-native";
import FontAwesome5 from "react-native-vector-icons/FontAwesome5";

import { getPublishedFeedback } from "../API/feedbackApi";

const { width } = Dimensions.get("window");
// Just under the viewport so the next card peeks in - the edge of a second
// card is what tells someone the row scrolls at all.
const CARD_WIDTH = Math.min(300, width - 88);

interface Feedback {
  _id: string;
  rating: number;
  message?: string;
  name?: string;
  createdAt?: string;
  publishedAt?: string;
}

/**
 * The published testimonial strip.
 *
 * Renders NOTHING until it has something to show - no heading, no skeleton,
 * no "no reviews yet" placeholder. A marketing surface with an empty
 * testimonials section is worse than one with no such section: it advertises
 * that nobody has said anything. An admin promotes entries from the
 * dashboard, and the strip appears once at least one exists.
 */
const FeedbackShowcase = () => {
  const [items, setItems] = useState<Feedback[]>([]);

  useEffect(() => {
    let alive = true;
    getPublishedFeedback(10)
      .then((res) => {
        if (alive) setItems(res?.data?.data || []);
      })
      // Silent: this is decoration on a landing screen, and an error toast
      // for a missing testimonial strip would be noise over a working app.
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.eyebrow}>WHAT DINERS SAY</Text>
      <Text style={styles.heading}>Loved by people who hate waiting</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        // Snapping makes a card land squarely rather than stopping halfway
        // across two, which is what makes a horizontal strip feel deliberate.
        snapToInterval={CARD_WIDTH + 14}
        decelerationRate="fast"
      >
        {items.map((item) => (
          <View key={item._id} style={[styles.card, { width: CARD_WIDTH }]}>
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <FontAwesome5
                  key={n}
                  name="star"
                  solid={n <= item.rating}
                  size={12}
                  color={n <= item.rating ? "#f59e0b" : "#e2e8f0"}
                />
              ))}
            </View>

            {/* Capped rather than truncated mid-strip: a card that grows to
                fit a long review would break the row's rhythm. */}
            <Text style={styles.quote} numberOfLines={5}>
              {item.message}
            </Text>

            <Text style={styles.author}>{item.name || "A BhojanQR diner"}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

export default FeedbackShowcase;

const styles = StyleSheet.create({
  section: { paddingTop: 40, paddingBottom: 8 },
  eyebrow: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    color: "#16a34a",
    textAlign: "center",
  },
  heading: {
    fontSize: 22,
    fontWeight: "900",
    color: "#1f2937",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 20,
    paddingHorizontal: 24,
  },
  row: { paddingHorizontal: 24, gap: 14, paddingBottom: 6 },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 18,
  },
  starRow: { flexDirection: "row", gap: 3, marginBottom: 12 },
  quote: { fontSize: 14, lineHeight: 21, color: "#374151" },
  author: { fontSize: 12, fontWeight: "800", color: "#16a34a", marginTop: 14 },
});
