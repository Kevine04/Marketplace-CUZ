import { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Linking,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Card } from '../components/Card';
import type { Order, Product, UserAccount } from '../types';

type DashboardScreenProps = {
  account: UserAccount;
  initialProducts: Product[];
};

export function DashboardScreen({ account, initialProducts }: DashboardScreenProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [orders, setOrders] = useState<Order[]>([]);
  const [listingTitle, setListingTitle] = useState('');
  const [listingDescription, setListingDescription] = useState('');
  const [listingPrice, setListingPrice] = useState('');

  const earnings = useMemo(
    () =>
      orders
        .filter((order) => order.seller === account.email && order.status !== 'refunded')
        .reduce((total, order) => total + order.price, 0),
    [account.email, orders],
  );

  const dashboardStats = useMemo(
    () => ({
      ordersReceived: orders.filter((order) => order.seller === account.email).length,
      pendingClarification: orders.filter(
        (order) => order.seller === account.email && order.status === 'pending-clarification',
      ).length,
      refunds: orders.filter((order) => order.seller === account.email && order.status === 'refunded').length,
    }),
    [account.email, orders],
  );

  const addListing = () => {
    const price = Number(listingPrice);
    if (!listingTitle.trim() || !listingDescription.trim() || Number.isNaN(price) || price <= 0) {
      Alert.alert('Missing details', 'Add title, description, and a valid positive price.');
      return;
    }

    const newItem: Product = {
      id: Date.now().toString(),
      title: listingTitle.trim(),
      description: listingDescription.trim(),
      price,
      seller: account.email,
    };

    setProducts((current) => [newItem, ...current]);
    setListingTitle('');
    setListingDescription('');
    setListingPrice('');
    Alert.alert('Published', 'Your listing is now visible to student buyers.');
  };

  const placeOrder = (item: Product) => {
    const newOrder: Order = {
      ...item,
      buyerEmail: account.email,
      status: 'pending-clarification',
    };

    setOrders((current) => [newOrder, ...current]);
    Alert.alert(
      'Order placed',
      'Seller has been notified. Confirm final price and details before marking order confirmed.',
    );
  };

  const requestRefund = (id: string) => {
    setOrders((current) => current.map((order) => (order.id === id ? { ...order, status: 'refunded' } : order)));
  };

  const confirmOrder = (id: string) => {
    setOrders((current) =>
      current.map((order) => (order.id === id ? { ...order, status: 'confirmed' } : order)),
    );
  };

  const bookRide = async () => {
    const deepLink = 'uber://';
    const webFallback = 'https://m.uber.com/';

    const canOpenDeepLink = await Linking.canOpenURL(deepLink);
    const target = canOpenDeepLink ? deepLink : webFallback;
    await Linking.openURL(target);
  };

  const visibleProducts =
    account.role === 'seller'
      ? products.filter((product) => product.seller === account.email)
      : products.filter((product) => product.seller !== account.email);

  const visibleOrders =
    account.role === 'seller'
      ? orders.filter((order) => order.seller === account.email)
      : orders.filter((order) => order.buyerEmail === account.email);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Hello, {account.role === 'seller' ? 'Seller' : 'Buyer'}</Text>
        <Text style={styles.subtitle}>Signed in: {account.email}</Text>

        <Card title="Dashboard">
          <Text>Earnings: ${earnings.toFixed(2)}</Text>
          <Text>Orders: {dashboardStats.ordersReceived}</Text>
          <Text>Pending clarification: {dashboardStats.pendingClarification}</Text>
          <Text>Refunded: {dashboardStats.refunds}</Text>
          <Pressable onPress={bookRide} style={styles.secondaryButton}>
            <Text style={styles.secondaryLabel}>Book Ride (Uber)</Text>
          </Pressable>
        </Card>

        {account.role === 'seller' ? (
          <Card title="List Your Business">
            <TextInput
              value={listingTitle}
              onChangeText={setListingTitle}
              placeholder="What are you selling?"
              style={styles.input}
            />
            <TextInput
              value={listingDescription}
              onChangeText={setListingDescription}
              placeholder="Describe your product/service"
              style={styles.input}
            />
            <TextInput
              value={listingPrice}
              onChangeText={setListingPrice}
              placeholder="Price"
              keyboardType="decimal-pad"
              style={styles.input}
            />
            <Pressable onPress={addListing} style={styles.primaryButton}>
              <Text style={styles.primaryLabel}>Publish Listing</Text>
            </Pressable>
          </Card>
        ) : null}

        <Card title="Marketplace Listings">
          {visibleProducts.length === 0 ? <Text>No listings available yet.</Text> : null}
          <FlatList
            data={visibleProducts}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            renderItem={({ item }) => (
              <View>
                <Text style={styles.itemTitle}>{item.title}</Text>
                <Text>{item.description}</Text>
                <Text>Seller: {item.seller}</Text>
                <Text style={styles.price}>${item.price.toFixed(2)}</Text>
                {account.role === 'buyer' ? (
                  <Pressable onPress={() => placeOrder(item)} style={styles.secondaryButton}>
                    <Text style={styles.secondaryLabel}>Order Now</Text>
                  </Pressable>
                ) : null}
              </View>
            )}
          />
        </Card>

        <Card title="Orders">
          {visibleOrders.length === 0 ? <Text>No orders yet.</Text> : null}
          {visibleOrders.map((order) => (
            <View key={`${order.id}-${order.buyerEmail}`} style={styles.orderCard}>
              <Text style={styles.itemTitle}>{order.title}</Text>
              <Text>Buyer: {order.buyerEmail}</Text>
              <Text>Status: {order.status}</Text>
              <View style={styles.orderButtonsRow}>
                <Pressable onPress={() => confirmOrder(order.id)} style={styles.secondaryButton}>
                  <Text style={styles.secondaryLabel}>Confirm</Text>
                </Pressable>
                <Pressable onPress={() => requestRefund(order.id)} style={styles.dangerButton}>
                  <Text style={styles.dangerLabel}>Refund</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f8',
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingVertical: 8,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
  subtitle: {
    color: '#555',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  primaryButton: {
    backgroundColor: '#198754',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryLabel: {
    color: '#fff',
    fontWeight: '700',
  },
  secondaryButton: {
    marginTop: 8,
    backgroundColor: '#e7f1ff',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
  },
  secondaryLabel: {
    color: '#0d6efd',
    fontWeight: '600',
  },
  dangerButton: {
    marginTop: 8,
    marginLeft: 8,
    backgroundColor: '#fdecec',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
  },
  dangerLabel: {
    color: '#c92a2a',
    fontWeight: '700',
  },
  separator: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 10,
  },
  itemTitle: {
    fontWeight: '700',
  },
  price: {
    fontWeight: '700',
    marginTop: 4,
  },
  orderCard: {
    borderWidth: 1,
    borderColor: '#e6e6e6',
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },
  orderButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
