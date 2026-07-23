<script setup>
import { reactive } from 'vue';
import api from '@/api/member'
import Header from '@/components/auth/header.vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/useUserStore';
const router = useRouter();
const userStore = useUserStore();

const loginUser = reactive({
    email: '',
    password: ''
});

// 면접관이 타이핑 없이 원클릭으로 로그인할 수 있도록 제공하는 데모 계정
const demoAccounts = [
    { email: 'user01@test.com', role: '일반 회원' },
    { email: 'user02@test.com', role: '일반 회원' },
    { email: 'seller@test.com', role: '판매자' },
];
const DEMO_PASSWORD = 'qwer1234';

const login = async () => {
    const response = await api.memberLogin(loginUser);
    if (response.success) {
        userStore.login(response.results);
        router.push('/');
    } else {
        alert('로그인 실패: ' + response.message);
    }
};

const quickLogin = (email) => {
    loginUser.email = email;
    loginUser.password = DEMO_PASSWORD;
    login();
};

</script>

<template>
    <div class="bg-body-tertiary">
        <div class="d-flex align-items-center justify-content-center vh-100">
            <div class="container">
                <div class="row justify-content-center">
                    <div class="col-12 col-md-8 col-lg-6 col-xl-5">

                        <main class="bg-body p-4 p-md-5 rounded-4 shadow">
                            <form @submit.prevent="login">
                                <Header view="login" />

                                <div class="form-floating mb-3">
                                    <input type="email" class="form-control form-control-lg" id="floatingInput"
                                        @keyup.enter="login" placeholder="name@example.com" required
                                        v-model="loginUser.email">
                                    <label for="floatingInput">이메일 주소</label>
                                </div>

                                <div class="form-floating mb-3">
                                    <input type="password" class="form-control form-control-lg" id="floatingPassword"
                                        @keyup.enter="login" placeholder="Password" required
                                        v-model="loginUser.password">
                                    <label for="floatingPassword">비밀번호</label>
                                </div>
                                <button class="btn btn-primary w-100 py-2 mt-4" type="button" @click="login">
                                    로그인
                                </button>

                                <div class="border rounded-3 p-3 mt-4 bg-body-tertiary">
                                    <p class="small text-secondary fw-semibold mb-2">
                                        데모 계정
                                        <span class="fw-normal">(클릭 시 바로 로그인)</span>
                                    </p>
                                    <div class="d-grid gap-2">
                                        <button v-for="account in demoAccounts" :key="account.email"
                                            type="button"
                                            class="btn btn-outline-secondary btn-sm d-flex justify-content-between align-items-center"
                                            @click="quickLogin(account.email)">
                                            <span>{{ account.email }}</span>
                                            <span class="badge text-bg-light">{{ account.role }}</span>
                                        </button>
                                    </div>
                                    <p class="small text-secondary text-center mb-0 mt-2">
                                        공통 비밀번호: qwer1234
                                    </p>
                                </div>

                                <div class="text-center mt-4">
                                    <RouterLink to="/find-email" class="text-decoration-none text-secondary small">
                                        아이디 찾기
                                    </RouterLink>
                                    <span class="text-secondary mx-1">|</span>
                                    <RouterLink to="/find-password" class="text-decoration-none text-secondary small">
                                        비밀번호 찾기
                                    </RouterLink>
                                    <span class="text-secondary mx-1">|</span>
                                    <RouterLink to="/sign-up" class="text-decoration-none text-secondary small">
                                        회원가입
                                    </RouterLink>
                                </div>
                            </form>
                        </main>

                    </div>
                </div>
            </div>
        </div>
    </div>

</template>

<style scoped></style>