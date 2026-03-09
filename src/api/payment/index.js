import api from '@/plugins/axiosInterceptor'

const validateSeats = async (req) => {
  let data = {}
  const url = '/api/order/validate-seats'

  await api
    .post(url, req)
    .then((res) => {
      data = res.data
    })
    .catch((error) => {
      data = error.response.data
    })

  return data
}

const getPaymentStatus = async (paymentId) => {
  let data = {}
  const url = `/api/payment/${paymentId}/status`

  await api
    .get(url)
    .then((res) => {
      data = res.data
    })
    .catch((error) => {
      data = error.response.data
    })

  return data
}

export default { validateSeats, getPaymentStatus }
