<script setup>
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/useUserStore'
import PortOne from '@portone/browser-sdk/v2'
import Calendar from '@/components/Calendar.vue'

import productAPI from '@/api/product'
import paymentAPI from '@/api/payment'

import { Client } from '@stomp/stompjs'

const router = useRouter()
const route = useRoute()

const props = defineProps({
  productName: String,
  openDate: String,
  openDateFormat: String
})

const openModal = ref(false) // 예매 모달창 오픈 여부
const isBack = ref(false)
const closeModal = () => {
  step.value = 1
  paymentForm.value.roundTimeIdx = ''
  paymentForm.value.seatIdxes = []
  openModal.value = false
}

const bookingPageReset = () => {
  selectedDate.value = ''
  selectedTime.value = ''
  seatGrades.value = ''
  selectedSeats.value = []
  disabledSeats.value = []
  seats.value = []
  isLoading.value = true
  loadError.value = null

  roundTimes.value = []
  disabledSeatIdxes.value = []
}

const productDetail = ref(null)
const selectedDate = ref('')
const selectedTime = ref('')
const selectedDateFormat = ref('')
const seatGrades = ref([])
const selectedSeats = ref([])
const disabledSeats = ref([])
const disabledSeatIdxes = ref([])
const step = ref(1)
const seats = ref([])
const isLoading = ref(true)
const loadError = ref(null)

const roundTimes = ref([])

// 결제 정보 FORM
const paymentForm = ref({
  productIdx: route.params.id,
  roundTimeIdx: '',
  seatIdxes: [],
})

// 사용자 정보
const userStore = useUserStore()
const myNickname = userStore.nickname

const seatSocketClient = new Client({
  brokerURL: import.meta.env.VITE_WS_URL,
  reconnectDelay: 5000,
  debug: function (str) {
    console.log(str)
  },
})

seatSocketClient.onConnect = (frame) => {
  console.log('웹소켓 연결 성공:', frame)

  // 좌석 선택 구독
  seatSocketClient.subscribe(
    `/topic/seats/${selectedTime.value.idx}`,
    (msg) => {
      const received = JSON.parse(msg.body)
      const { seatName, sender, action } = received

      // 송신자와 나의 닉네임이 같지 않으면
      if (sender !== myNickname) {
        // action이 select이면
        if (action === 'select') {
          // 잠긴 좌석 목록에 해당 좌석이 없으면
          if (!disabledSeats.value.includes(seatName)) {
            // 잠긴 좌석 목록에 추가한다.
            disabledSeats.value.push(seatName)
            console.log('다른 유저 선택으로 블락된 좌석:', seatName)
          }
        } else if (action === 'deselect') {

          // 좌석 이름으로 인덱스 조회
          const index = disabledSeats.value.indexOf(seatName)

          // 인덱스가 있으면 제거
          if (index !== -1)
            disabledSeats.value.splice(index, 1)
          console.log('다른 유저 해제로 블락 해제된 좌석:', seatName)
        }
      }
    },
  )

  seatSocketClient.subscribe(
    `/topic/seats/map/${selectedTime.value.idx}`,
    (msg) => {
      const rockSeats = JSON.parse(msg.body)
      console.log("좌석 맵" + rockSeats)
      const keys = Object.keys(rockSeats).map(Number)

      const rockedSeats = seats.value.filter(seat => {
        return rockSeats.includes(seat.idx)
      }).map(seat => seat.name)

      disabledSeats.value = disabledSeats.value.filter(seat => {
        return !rockedSeats.includes(seat)
      })
    },
  )

  seatSocketClient.subscribe(
    `/topic/seats/expired/${selectedTime.value.idx}`,
    (msg) => {
      const rockSeatId = JSON.parse(msg.body)

      const rockedSeats = seats.value.filter(seat => {
        return seat.idx === rockSeatId
      }).map(seat => seat.name)

      disabledSeats.value = disabledSeats.value.filter(seat => {
        return !rockedSeats.includes(seat)
      })

      const findIdx = selectedSeats.value.findIndex(seat => seat.idx === rockSeatId)
      selectedSeats.value.splice(findIdx, 1)
    },
  )
}

const connectSeatSocket = () => {

  if (seatSocketClient.active) {
    seatSocketClient.deactivate()
  }

  seatSocketClient.activate()
}

// 좌석 정보를 불러 온다.
const loadSeatInfo = async () => {
  try {
    isLoading.value = true

    const seatInfoResponse = await productAPI.getSeatDates({
      productId: paymentForm.value.productIdx,
      roundTimeIdx: paymentForm.value.roundTimeIdx,
    })

    if (seatInfoResponse.success) {
      console.log(seatInfoResponse)
      seatGrades.value = seatInfoResponse.results.seatGrades
      seats.value = seatInfoResponse.results.seatMap.flat()
    }
  } catch (error) {
    console.error('초기 데이터 로드 실패:', error)
    loadError.value = '서버 통신 중 오류가 발생했습니다.'
  } finally {
    isLoading.value = false
  }
}

async function openBookingModal() {
  try {

    // 로그인 상태가 아니라면
    if (!userStore.isLogin) {
      router.push('/login')
      return
    }

    openModal.value = true

  } catch (error) {
    console.error('모달 열기 중 오류:', error)
  }
}

const totalPrice = computed(() =>
  selectedSeats.value.reduce((sum, s) => sum + s.priceInfo.price, 0),
)

function toggleSeat(seat) {
  if (seat.isReserved) {
    return
  }

  if (disabledSeats.value.includes(seat.name)) return

  disabledSeatIdxes.value.push(seat.idx)

  const idx = selectedSeats.value.findIndex((s) => s.name === seat.name)
  if (idx >= 0) {
    selectedSeats.value.splice(idx, 1)

    seatSocketClient.publish({
      destination: `/order/seats/${selectedTime.value.idx}`,
      body: JSON.stringify({
        seatName: seat.name,
        sender: myNickname,
        action: 'deselect', // 해제 action
        seatIdx: seat.idx
      }),
    })
  } else {
    selectedSeats.value.push(seat)

    seatSocketClient.publish({
      destination: `/order/seats/${selectedTime.value.idx}`,
      body: JSON.stringify({
        seatName: seat.name,
        sender: myNickname,
        action: 'select', // 선택 action
        seatIdx: seat.idx
      }),
    })
  }
}

const nextStep = async () => {
  // 달력에서 좌석으로 넘어갈 때
  if (step.value === 1) {
    if (!selectedDate.value) return alert('예매일을 선택하세요.')
    if (!selectedTime.value) return alert('회차를 선택하세요.')

    step.value++
    connectSeatSocket()

    await loadSeatInfo()
    openModal.value = false
    isBack.value = false
    // 실시간 좌석 정보 불러오기

    const req = {
      roundTimeIdx: selectedTime.value.idx
    }

    // getSeatStatus 메소드를 실행
    const statusResponse = await productAPI.getSeatStatusV2(req)

    if (statusResponse.success) {
      const rockSeats = statusResponse.results
      const keys = Object.keys(rockSeats).map(Number)

      const rockedSeats = seats.value.filter(seat => {
        return keys.includes(seat.idx)
      })

      rockedSeats.forEach(element => {
        disabledSeats.value.push(element.name)
      });
    }


  } else if (step.value === 2) {
    // 좌석에서 수령 방법으로 넘어갈 때
    if (selectedSeats.value.length === 0) return alert('좌석을 선택하세요.')
    step.value++
  } else if (step.value === 3) {
    await onSubmit()
  }
}

function prevStep() {
  if (step.value > 1) {
    step.value--
    openModal.value = !openModal.value
  }
}

watch(() => step.value, (newValue) => {
  if (newValue === 1) {
    isBack.value = true
    deleteRockedSeats()
    bookingPageReset()
    return
  }
})

// 결제를 진행하는 메서드
const onSubmit = async () => {
  const validteResponse = await paymentAPI.validateSeats({
    productIdx: paymentForm.value.productIdx,
    roundTimeIdx: paymentForm.value.roundTimeIdx,
    seatIdxes: paymentForm.value.seatIdxes,
  })

  const successValidateSeats = validteResponse.success

  // 좌석 검증이 성공하면 결제 진행
  if (successValidateSeats) {
    // 서버에서 PaymentIdx를 받는다.
    const paymentIdx = validteResponse.results.paymentIdx

    paymentForm.value.seatIdxes = selectedSeats.value.map((seat) => seat.idx)

    const totalAmount = totalPrice.value
    // const productIdxList = selectedSeats.value.map((s) => s.name)
    const paymentResponse = await PortOne.requestPayment({
      storeId: 'store-1ced0aba-9a78-47c4-a424-d03a4685fdd7',
      channelKey: 'channel-key-31b66752-13a4-429f-8a6f-ec087910a6d9',
      paymentId: paymentIdx,
      orderName: props.productName,
      totalAmount: totalAmount,
      currency: 'KRW',
      payMethod: 'CARD',
      customData: {
        productIdx: paymentForm.value.productIdx,
        roundTimeIdx: paymentForm.value.roundTimeIdx,
        seatIdxes: paymentForm.value.seatIdxes,
      },
    })

    if (!paymentResponse.code) {
      router.push('/payment/result')
    } else {
      console.log(paymentResponse.code)
    }
  } else {
    console.log('결제 오류')
    alert(validteResponse.message)
    return
  }
}

// 달력 컴포넌트에서 선택한 회차 날짜를 emit 받는 메서드
const selectedRoundDate = async (roundDate) => {
  console.log(roundDate)
  selectedDate.value = roundDate.idx
  selectedDateFormat.value = roundDate.date
  const response = await productAPI.getRoundTimes({
    dateId: selectedDate.value,
  })

  if (response.success) {
    roundTimes.value = response.results.times
  }
}

const selectRoundTime = () => {
  paymentForm.value.roundTimeIdx = selectedTime.value.idx
}

/**
 * 현재 사용자가 선택하여 잠긴 좌석을 좌석 락 DB에서 모두 제거한다.
 */
const deleteRockedSeats = async () => {

  // 잠긴 좌석이 없는 경우 취소
  if (disabledSeatIdxes.value.length == 0) {
    return
  }

  const req = {
    roundTimeIdx: selectedTime.value.idx,
    rockedSeats: disabledSeatIdxes.value
  }

  const response = await productAPI.deleteRockedSeats(req)
}

const targetDate = computed(() => {
  return new Date(props.openDate)
})

// 현재 시각과 비교
const isOpened = computed(() => {
  if (!targetDate.value) return false
  return new Date() >= targetDate.value
})

let timer = ref()
const remainingTime = ref()
const updateRemainingTime = () => {
  if (!targetDate.value) return
  const now = new Date()
  const diff = targetDate.value - now

  if (diff <= 0) {
    clearInterval(timer)
    return
  }

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  // 0인 단위는 출력하지 않기
  let parts = []
  if (hours > 0) parts.push(`${hours}시간`)
  if (minutes > 0) parts.push(`${minutes}분`)
  if (seconds > 0) parts.push(`${seconds}초 남음`)

  remainingTime.value = parts.join(" ")
}

onMounted(() => {
  updateRemainingTime()
  timer.value = setInterval(updateRemainingTime, 1000)
})

onUnmounted(() => {
  if (timer.value) clearInterval(timer)
})
</script>

<template>
  <button @click="openBookingModal" type="button" class="btn btn-primary btn-lg shadow" data-bs-target="#staticBackdrop"
    :data-bs-toggle="userStore.isLogin ? 'modal' : ''" :disabled="!isOpened">
    <span v-if="!isOpened">
      {{ props.openDateFormat }} /
      <span>
        {{ remainingTime }}
      </span>
    </span>
    <span v-else>
      예매하기
    </span>
  </button>


  <div class="modal fade" id="staticBackdrop" tabindex="-1" aria-hidden="true" aria-labelledby="staticBackdropLabel"
    data-bs-backdrop="static" data-bs-keyboard="false">
    <div class="modal-dialog modal-xl modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="staticBackdropLabel">티켓 예매</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" @click="closeModal"></button>
        </div>
        <div class="modal-body">
          <div class="steps mb-3">
            <div :class="['step', { active: step === 1 }]">Step 1<br />날짜 및 회차</div>
            <div :class="['step', { active: step === 2 }]">Step 2<br />좌석 선택</div>
            <div :class="['step', { active: step === 3 }]">Step 3<br />최종 확인</div>
          </div>

          <!-- 예매일 선택 start -->
          <div v-if="step === 1" class="step-content d-flex gap-2">
            <div class="w-50">
              <h4>예매일 선택</h4>
              <Calendar :product-id="Number(route.params.id)" :start-date="productDetail?.startDate"
                :end-date="productDetail?.endDate" @round-date="selectedRoundDate"
                :is-open-reservation-modal="openModal" :is-back="isBack" />
            </div>
            <div class="w-50 d-flex flex-column justify-content-between">
              <div class="w-100">
                <h4 class="mt-3">회차 선택</h4>
                <select v-model="selectedTime" class="form-select w-100" @change="selectRoundTime">
                  <option disabled value="">회차를 선택하세요</option>
                  <option v-for="roundTime in roundTimes" :key="roundTime.time" :value="roundTime">
                    {{ roundTime.time }}
                  </option>
                </select>
              </div>
              <div class="d-flex flex-column gap-2">
                <button class="btn btn-dark btn-lg" @click="nextStep">
                  {{ step === 3 ? '결제하기' : '다음' }}
                </button>
              </div>
            </div>
          </div>
          <!-- 예매일 선택 end -->

          <!-- 좌석 선택 start -->
          <div v-if="step === 2" class="step-content d-flex gap-3">
            <!-- 좌석 로딩 중 메시지 -->
            <div v-if="isLoading" class="text-center">
              <div class="spinner-border" role="status">
                <span class="visually-hidden">Loading...</span>
              </div>
              <p class="mt-2">좌석 정보를 불러오는 중...</p>
            </div>
            <!-- 좌석 로드 오류 메시지 -->
            <div v-else-if="loadError" class="alert alert-danger">
              {{ loadError }}
            </div>
            <!-- 좌석 목록이 비어 있을 때 메시지 -->
            <div v-else-if="seats.length === 0" class="alert alert-info">
              <p>좌석 정보가 없습니다.</p>
            </div>
            <div v-else class="w-100">
              <h4>좌석 선택 (총 {{ seats.length }}석)</h4>
              <div class="seat-legend mb-3 d-flex gap-3">
                <div v-for="grade in seatGrades" :key="grade.grade" class="legend-item"
                  :class="grade.grade.toLowerCase()">
                  <div class="color-box" :class="grade.grade.toLowerCase()"></div>
                  {{ grade.grade }}석 - {{ grade.priceInfo.priceFormat }}
                </div>
              </div>
              <div class="seat-grid">
                <div v-for="seat in seats" :key="seat.name" class="shadow-lg" :class="[
                  'seat',
                  seat.grade.toLowerCase(),
                  {
                    selected: selectedSeats.some((s) => s.name === seat.name),
                    disabled: disabledSeats.includes(seat.name) || seat.isReserved,
                  },
                ]" @click="toggleSeat(seat)">
                  {{ seat.name }}
                </div>
              </div>
            </div>
            <div class="d-flex flex-column gap-2 w-75 justify-content-between">
              <div class="summary d-flex flex-column gap-2 justify-content-between">
                <h5>예매 요약</h5>
                <p><strong>예매일:</strong> {{ selectedDateFormat || '선택 안 됨' }}</p>
                <p><strong>회차:</strong> {{ selectedTime.time || '선택 안 됨' }}</p>
                <p>
                  <strong>좌석:</strong>
                  {{selectedSeats.map((s) => s.name).join(', ') || '선택 안 됨'}}
                </p>
                <!-- <p><strong>수령 방법:</strong> {{ deliveryMethod || '선택 안 됨' }}</p> -->
                <p><strong>총 금액:</strong> {{ totalPrice.toLocaleString() }} 원</p>
              </div>
              <div class="d-flex gap-2 flex-column w-100">
                <button class="btn btn-dark btn-lg" @click="nextStep">
                  {{ step === 3 ? '결제하기' : '다음' }}
                </button>
                <button class="btn btn-light border btn-lg" @click="prevStep">이전</button>
              </div>
            </div>
          </div>
          <!-- 좌석 선택 start -->

          <!-- 티켓 수령 방법 start -->
          <div v-if="step === 3" class="step-content d-flex gap-2">
            <div class="d-flex flex-column gap-2 w-100 justify-content-between">
              <h4 class="text-center">구매한 티켓은 현장에서 발급받을 수 있습니다.</h4>

              <div class="summary d-flex flex-column gap-2 justify-content-between">
                <h5>예매 요약</h5>
                <p><strong>예매일:</strong> {{ selectedDateFormat || '선택 안 됨' }}</p>
                <p><strong>회차:</strong> {{ selectedTime.time || '선택 안 됨' }}</p>
                <p>
                  <strong>좌석:</strong>
                  {{selectedSeats.map((s) => s.name).join(', ') || '선택 안 됨'}}
                </p>
                <!-- <p><strong>수령 방법:</strong> {{ deliveryMethod || '선택 안 됨' }}</p> -->
                <p><strong>총 금액:</strong> {{ totalPrice.toLocaleString() }} 원</p>
              </div>
              <div class="d-flex gap-2 flex-column w-100">
                <button class="btn btn-dark btn-lg" @click="nextStep">결제하기</button>
                <button class="btn btn-light border btn-lg" @click="prevStep">이전</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.steps {
  display: flex;
  justify-content: center;
  margin-bottom: 1rem;
}

.step {
  cursor: pointer;
  padding: 10px 20px;
  margin: 0 10px;
  border-radius: 10px;
  background-color: #e9ecef;
  user-select: none;
  text-align: center;
  font-weight: 500;
  transition: background-color 0.3s;
}

.step.active {
  background-color: #dc3545;
  color: white;
  font-weight: bold;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
  max-width: 400px;
  user-select: none;
}

.day {
  padding: 8px;
  border-radius: 4px;
  border: 1px solid #ccc;
  text-align: center;
  cursor: pointer;
  user-select: none;
  font-weight: 500;
}

.day.available {
  background-color: white;
  color: black;
}

.day.disabled {
  background-color: #eee;
  color: #aaa;
  cursor: default;
  text-decoration: line-through;
}

.day.selected {
  background-color: #dc3545;
  color: white;
  font-weight: bold;
}

.day.today {
  border: 2px solid #007bff;
}

.seat-legend {
  font-weight: 600;
  font-size: 0.9rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.color-box {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  border: 1px solid #aaa;
}

.color-box.vip {
  background-color: gold;
}

.color-box.r {
  background-color: lightblue;
}

.color-box.s {
  background-color: lightgreen;
}

.color-box.a {
  background-color: #ddd;
  color: #555;
}

.seat-grid {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 6px;
  max-width: 600px;
  user-select: none;
}

.seat {
  padding: 6px;
  border-radius: 4px;
  border: 1px solid #ccc;
  text-align: center;
  cursor: pointer;
  user-select: none;
  font-weight: 500;
  font-size: 0.9rem;
}

.seat.vip {
  background-color: gold;
  color: black;
}

.seat.r {
  background-color: lightblue;
  color: black;
}

.seat.s {
  background-color: lightgreen;
  color: black;
}

.seat.a {
  background-color: #ddd;
  color: #555;
}

.seat.selected {
  outline: 3px solid #dc3545;
}

.summary p {
  margin: 0.2rem 0;
}

.seat.disabled {
  background-color: #666;
  color: #666;
  pointer-events: none;
  cursor: not-allowed;
  opacity: 0.6;
}
</style>
