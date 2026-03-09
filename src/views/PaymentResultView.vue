<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import paymentAPI from '@/api/payment'

const router = useRouter()
const route = useRoute()

const isLoading = ref(true)
const errorMessage = ref('')
const payment = ref(null)

const paymentId = computed(() => route.query.paymentId || '')
const paymentStatus = computed(() => payment.value?.status || '-')
const reservationNumber = computed(() => payment.value?.paymentIdx || paymentId.value || '-')
const orderName = computed(() => payment.value?.orderName || payment.value?.productName || '-')
const payMethod = computed(() => payment.value?.payMethod || payment.value?.method || '-')
const paidAt = computed(() => payment.value?.paidAt || '-')
const seatInfo = computed(() => {
  const seats = payment.value?.seatNames || payment.value?.seats
  if (Array.isArray(seats)) {
    return seats.join(', ')
  }
  return seats || '-'
})
const totalAmount = computed(() => {
  const amount = payment.value?.totalAmount || payment.value?.amount
  if (typeof amount !== 'number') return '-'
  return `${amount.toLocaleString()}원`
})

// 결제 결과를 API에서 조회하여 상태를 업데이트
const loadPaymentResult = async () => {

  // 결제 ID 없이 접근한 경우 에러 메시지 표시
  if (!paymentId.value) {
    errorMessage.value = '결제 정보가 없습니다. 결제 후 다시 접근해주세요.'
    isLoading.value = false
    return
  }

  try {

    const response = await paymentAPI.getPaymentStatus(paymentId.value)

    if (!response.success) {
      errorMessage.value = response.message || '결제 정보를 조회하지 못했습니다.'
      return
    }

    payment.value = response.results

  } catch (error) {

    console.error('결제 결과 조회 실패:', error)
    errorMessage.value = '결제 정보를 조회하는 중 오류가 발생했습니다.'

  } finally {

    isLoading.value = false

  }
}

onMounted(loadPaymentResult)

</script>

<template>
  <div class="container my-5 p-4 bg-white rounded shadow-sm">
    <div class="text-center pb-3 mb-4 border-bottom">
      <h2 class="text-success fw-bold mb-2">결제 결과</h2>
      <p class="text-secondary">예매 상세내역은 마이페이지에서 확인할 수 있습니다.</p>

      <div v-if="isLoading" class="py-4">결제 정보를 불러오는 중입니다...</div>
      <div v-else-if="errorMessage" class="alert alert-danger">{{ errorMessage }}</div>
      <div v-else class="row">
        <div class="col-md-7">
          <div class="mb-4">
            <h5 class="section-title-underline pb-1 mb-3">예매정보</h5>
            <div class="d-flex justify-content-between mb-2">
              <span class="fw-bold text-dark">예매 번호</span>
              <span>{{ reservationNumber }}</span>
            </div>
            <div class="d-flex justify-content-between mb-2">
              <span class="fw-bold text-dark">공연명</span>
              <span>{{ orderName }}</span>
            </div>
            <div class="d-flex justify-content-between mb-2">
              <span class="fw-bold text-dark">결제 시간</span>
              <span>{{ paidAt }}</span>
            </div>
            <div class="d-flex justify-content-between mb-2">
              <span class="fw-bold text-dark">좌석</span>
              <span>{{ seatInfo }}</span>
            </div>
          </div>
        </div>

        <div class="col-md-5 d-flex flex-column">
          <div class="flex-grow-1 mb-4">
            <h5 class="section-title-underline pb-1 mb-3">결제정보</h5>
            <div class="d-flex justify-content-between mb-2">
              <span class="fw-bold text-dark">결제 상태</span>
              <span>{{ paymentStatus }}</span>
            </div>
            <div class="d-flex justify-content-between mb-2">
              <span class="fw-bold text-dark">결제수단</span>
              <span>{{ payMethod }}</span>
            </div>
            <div class="payment-total-box p-3 rounded text-center mt-3 bg-light">
              <div class="text-secondary fs-6 mb-1">총 결제금액</div>
              <div class="fs-2 fw-bold text-danger">{{ totalAmount }}</div>
            </div>
          </div>
        </div>

        <div class="pt-4 mt-4 border-top">
          <h5 class="section-title-underline pb-1 mb-3">안내</h5>
          <div class="d-flex justify-content-between mb-2 fs-6">
            <span class="fw-bold text-dark">확인 경로</span>
            <span class="fw-bold text-danger">마이페이지 &gt; 예매내역</span>
          </div>
        </div>

        <div class="d-grid gap-2 col-3 mx-auto mt-5">
          <button class="btn btn-primary btn-lg" type="button" @click="router.push('/mypage/reserve')">예매내역확인</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* CSS 클래스에 대한 스타일을 정의하여 재사용성과 유지보수성을 높입니다. */
.section-title-underline {
  border-bottom: 2px solid #333;
}

.shadow-sm {
  box-shadow: 0 .125rem .25rem rgba(0, 0, 0, .075) !important;
}
</style>
