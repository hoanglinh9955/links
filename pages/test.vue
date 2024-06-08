<template>
  <div>
    <h2>Shopping Cart</h2>
    <table>
      <thead>
        <tr>
          <th>Car Name</th>
          <th>Quantity</th>
          <th>Cost</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in cartItems" :key="item.id">
          <td>{{ item.name }}</td>
          <td>{{ item.quantity }}</td>
          <td>{{ item.cost * item.quantity }}</td>
        </tr>
        <tr>
          <td colspan="2">Total Cost</td>
          <td>{{ cartTotalCost }}</td>
        </tr>
        <tr>
          <td colspan="3">
            <button @click="handleClearCart">Clear Cart</button>
            <button @click="handleCheckOutCart">Check out QR</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
import { useRouter } from 'vue-router'
import { ref, watchEffect } from 'vue'

export default {
  setup() {
    const router = useRouter()
    const cartItems = ref([])
    const cartTotalCost = ref(0)

    const My_Bank = {
      BANK_ID: '970423',
      ACCOUNT_NO: '98651198044',
      TEMPLATE: 'czSs4yJ',
      ACCOUNT_NAME: 'LE HOANG LINH',
      DESCRIPTION: 'CK Thanh Toan Don Hang'
    }

    const handleClearCart = () => {
      cartItems.value = []
      cartTotalCost.value = 0
      clearCart()
    }

    const handleCheckOutCart = () => {
      const { BANK_ID, ACCOUNT_NO, TEMPLATE, ACCOUNT_NAME, DESCRIPTION } = My_Bank
      const AMOUNT = 2000
      const imageUrl = `https://img.vietqr.io/image/${BANK_ID}-${ACCOUNT_NO}-${TEMPLATE}.jpg?accountName=${ACCOUNT_NAME}&amount=${AMOUNT}&addInfo=${DESCRIPTION}`
      // const url = `https://api.vietqr.io/image/970423-98651198044-czSs4yJ.jpg?accountName=LE%20HOANG%20LINH&amount=2000&addInfo=CK%20Thanh%20Toan%20Don%20Hang`
      window.open(imageUrl)
    }

    const clearCart = () => {
      // Clear cart data in the application context
    }

    watchEffect(() => {
      const { cartItems: initialCartItems, cartTotalCost: initialCartTotalCost } =
        router.currentRoute.value.state || {}
      cartItems.value = initialCartItems || []
      cartTotalCost.value = initialCartTotalCost || 0
    })

    return {
      cartItems,
      cartTotalCost,
      handleClearCart,
      handleCheckOutCart
    }
  }
}
</script>