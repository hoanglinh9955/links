import { ref, computed, onMounted, watch } from 'vue'

export function useCart() {
  const cart = ref([])

  // Load cart from session storage on mount
  onMounted(() => {
    const storedCart = sessionStorage.getItem('cart')
    if (storedCart) {
      cart.value = JSON.parse(storedCart)
    }
  })

  // Watch for changes to the cart and save to session storage
  watch(cart, (newCart) => {
    sessionStorage.setItem('cart', JSON.stringify(newCart))
  }, { deep: true })

  const addToCart = (item) => {
    const existingItem = cart.value.find(cartItem => cartItem.id === item.id)
    if (existingItem) {
      existingItem.quantity += 1
    } else {
      cart.value.push({ ...item, quantity: 1 })
    }
  }

  const removeFromCart = (itemId) => {
    cart.value = cart.value.filter(item => item.id !== itemId)
  }

  const clearCart = () => {
    cart.value = []
  }

  const totalItems = computed(() => cart.value.reduce((total, item) => total + item.quantity, 0))
  const totalPrice = computed(() => cart.value.reduce((total, item) => total + item.price * item.quantity, 0))

  return {
    cart,
    addToCart,
    removeFromCart,
    clearCart,
    totalItems,
    totalPrice
  }
}
