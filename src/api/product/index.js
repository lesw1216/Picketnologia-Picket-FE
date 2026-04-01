import api from '@/plugins/axiosInterceptor'

const getProducts = async (req) => {
  let data = {}

  let url = '/api/products'

  await api
    .get(url, {
      params: req,
    })
    .then((res) => {
      data = res.data
    })
    .catch((error) => {
      data = error.response.data
    })

  return data
}

const getProductDetail = async (req) => {
  let data = {}
  const url = '/api/products/' + req.productId

  await api
    .get(url)
    .then((res) => {
      data = res.data
    })
    .catch((error) => {
      data = error.data
    })

  return data
}

const addProduct = async (req) => {
  let data = {}
  const url = '/api/products'

  await api
    .post(url, req, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    .then((res) => {
      data = res.data
    })
    .catch((error) => {
      data = error.response.data
    })

  return data
}

const getAvailableDates = async (req) => {
  let data = {}
  const url = `/api/round?idx=${req.id}`

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

const getSeatDates = async (req) => {
  let data = {}
  const url = `/api/seat-info?product=${req.productId}&roundTime=${req.roundTimeIdx}`

  await api
    .get(url)
    .then((res) => {
      data = res.data
    })
    .catch((error) => {
      data = error.data
    })

  return data
}

const getRoundDates = async (req) => {
  let data = {}
  const url = '/api/round/date?product=' + req.productId

  await api
    .get(url)
    .then((res) => {
      data = res.data
    })
    .catch((error) => {
      data = error
    })

  return data
}

const searchAndSort = async (params) => {
  let data = {}
  let url = '/api/products/searchAndSort'

  await api
    .get(url, { params })
    .then((res) => {
      data = res.data
    })
    .catch((error) => {
      data = error.data
    })

  return data
}

const getRoundTimes = async (req) => {
  let data = {}
  const url = '/api/round/time?date=' + req.dateId

  await api
    .get(url)
    .then((res) => {
      data = res.data
    })
    .catch((error) => {
      data = error
    })

  return data
}

const getSeatStatus = async (req) => {
  let data = {}
  const url = `/api/round/seat-status/${req.roundId}/${req.date}${req.time}`

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

const getHeldSeats = async (req) => {
  let data = {}
  const url = `/api/rounds/${req.roundTimeIdx}/seats`

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

const releaseSeats = async (req) => {
  let data = {}
  const url = `/api/rounds/${req.roundTimeIdx}/seats`

  await api
    .delete(url, {
      data: {
        seatIds: req.rockedSeats,
      },
    })
    .then((res) => {
      data = res.data
    })
    .catch((error) => {
      data = error.response.data
    })

  return data
}

const getTop5ProductOrderBySalesCount = async (req) => {
  let data = {}
  const url = '/api/home/products/best-sellers'

  await api
    .get(url, {
      params: {
        genre: req.genre,
      },
    })
    .then((res) => {
      data = res.data
    })
    .catch((error) => {
      data = error.response.data
    })

  return data
}

const getTop5UpcommingProducts = async () => {
  let data = {}
  const url = '/api/home/products/upcoming'

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

export default {
  getProducts,
  getProductDetail,
  addProduct,
  getAvailableDates,
  getSeatDates,
  getSeatStatus,
  getRoundDates,
  searchAndSort,
  getRoundTimes,
  getHeldSeats,
  releaseSeats,
  getTop5ProductOrderBySalesCount,
  getTop5UpcommingProducts,
}
