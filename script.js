/**
 * 바이브 카페 주문서 자바스크립트 (script.js)
 * 초보자도 쉽게 이해할 수 있도록 단계별로 상세한 주석을 달았습니다.
 */

// =========================================================================
// [Supabase 설정]
// - SUPABASE_URL: 사용하시는 Supabase 프로젝트의 Project URL 주소
// - SUPABASE_KEY: 사용하시는 Supabase 프로젝트의 anon(public) API 키
// - 아래 빈 따옴표('') 안에 본인의 키 값을 직접 입력해 주세요!
// =========================================================================
const SUPABASE_URL = 'https://bypkxpwedsyvlpgnbykj.supabase.co'; // 예: 'https://xyzcompany.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ5cGt4cHdlZHN5dmxwZ25ieWtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEzOTU5ODUsImV4cCI6MjEwNjk3MTk4NX0.X_5ZEX21_9FoR1a4FMGvvsEXY2xb-Heg_IYxpO2kQ4k'; // 예: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'

// Supabase 클라이언트 생성 (CDN으로 로드된 window.supabase.createClient 사용)
let supabaseClient = null;
if (window.supabase && SUPABASE_URL && SUPABASE_KEY) {
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

// HTML 문서가 모두 로드된 후 스크립트가 안전하게 실행되도록 이벤트 등록
document.addEventListener('DOMContentLoaded', () => {
  // 만약 클라이언트가 아직 초기화되지 않았다면 DOM 로드 시점에 재확인
  if (!supabaseClient && window.supabase && SUPABASE_URL && SUPABASE_KEY) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  }

  // =========================================================================
  // 1. 필요한 HTML 태그(요소)들을 가져오기
  // =========================================================================
  // 폼 및 주문 입력 요소들
  const orderForm = document.getElementById('order-form');               // 주문 폼 전체
  const nameInput = document.getElementById('customer-name');            // 이름 입력창
  const phoneInput = document.getElementById('customer-phone');          // 전화번호 입력창
  const drinkSelect = document.getElementById('drink-select');           // 음료 선택 드롭다운
  const quantityInput = document.getElementById('quantity');             // 수량 입력창
  const requestsInput = document.getElementById('requests');             // 요청사항 입력창
  const totalPriceArea = document.getElementById('total-price-area');     // 예상 금액 표시 영역
  const submitBtn = document.getElementById('submit-btn');               // 주문하기 버튼
  const resetBtn = document.getElementById('reset-btn');                 // 다시 작성 버튼
  const confirmationArea = document.getElementById('order-confirmation'); // 주문 확인 메시지 표시 영역

  // 탭 네비게이션 요소들
  const tabOrder = document.getElementById('tab-order');                 // '주문하기' 탭 버튼
  const tabHistory = document.getElementById('tab-history');             // '주문 내역' 탭 버튼
  const sectionOrder = document.getElementById('section-order');         // '주문하기' 섹션 화면
  const sectionHistory = document.getElementById('section-history');     // '주문 내역' 섹션 화면
  const orderBadge = document.getElementById('order-badge');             // 주문 내역 건수 배지

  // 주문 내역 목록 및 하단 요소들
  const orderList = document.getElementById('order-list');               // 주문 카드들이 들어갈 컨테이너
  const historySummary = document.getElementById('history-summary');     // 주문 내역 합계 요약
  const clearHistoryBtn = document.getElementById('clear-history-btn'); // 내역 모두 지우기 버튼

  // =========================================================================
  // 2. 상태 관리 변수
  // =========================================================================
  let orders = [];
  let nextOrderId = 1; // 주문 번호 자동 증가용 변수

  // =========================================================================
  // 3. 금액 계산 함수 (calculateTotal)
  // - 음료 기본 가격 + 사이즈 추가 금액 + 옵션 추가 금액을 더한 후,
  // - 수량을 곱하여 총 금액을 계산합니다.
  // - 음료를 선택하지 않았다면 0원을 반환합니다.
  // =========================================================================
  function calculateTotal() {
    // 1) 선택된 음료 확인
    const selectedOption = drinkSelect.selectedOptions[0];
    const baseDrinkPrice = selectedOption ? Number(selectedOption.dataset.price || 0) : 0;

    // 만약 음료를 선택하지 않았다면(기본값이거나 0원이면) 총 금액은 0원
    if (!drinkSelect.value || baseDrinkPrice === 0) {
      return 0;
    }

    // 2) 선택된 사이즈 추가 금액 확인 (라디오 버튼)
    const selectedSize = document.querySelector('input[name="size"]:checked');
    const sizePrice = selectedSize ? Number(selectedSize.dataset.price || 0) : 0;

    // 3) 선택된 추가 옵션들의 추가 금액 합산 (체크박스)
    const checkedOptions = document.querySelectorAll('input[name="options"]:checked');
    let optionPriceTotal = 0;
    checkedOptions.forEach((option) => {
      optionPriceTotal += Number(option.dataset.price || 0);
    });

    // 4) 수량 가져오기 (기본값 1, 최소 1)
    const quantity = Math.max(1, Number(quantityInput.value) || 1);

    // 5) 최종 금액 = (음료 가격 + 사이즈 금액 + 옵션 합계) * 수량
    const singleCupPrice = baseDrinkPrice + sizePrice + optionPriceTotal;
    const finalTotal = singleCupPrice * quantity;

    return finalTotal;
  }

  // =========================================================================
  // 4. 화면의 예상 금액을 갱신하는 함수
  // =========================================================================
  function updatePriceDisplay() {
    const total = calculateTotal();
    // toLocaleString() 함수를 사용하여 천 단위마다 콤마(,) 표시 (예: 5,000)
    totalPriceArea.textContent = `예상 금액: ${total.toLocaleString()}원`;
  }

  // =========================================================================
  // 5. 주문 내역 화면 렌더링 함수 (renderOrders)
  // - 최신 주문이 맨 위에 오도록 정렬하여 출력합니다.
  // - 보안을 위해 사용자가 입력한 문자열은 반드시 textContent로 삽입합니다.
  // =========================================================================
  function renderOrders() {
    // 1) 주문 건수 배지 업데이트
    orderBadge.textContent = String(orders.length);

    // 2) 주문 내역 컨테이너 비우기
    orderList.textContent = '';

    // 3) 주문이 없을 때 안내 문구 표시
    if (orders.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'empty-history';
      emptyMsg.textContent = '아직 주문 내역이 없어요 ☕';
      orderList.appendChild(emptyMsg);

      // 하단 요약 문구 업데이트 (0원, 0건)
      historySummary.textContent = '총 주문 금액: 0원 (0건)';
      return;
    }

    // 4) 최신 주문이 맨 위에 오도록 배열의 역순으로 복사하여 순회
    const reversedOrders = orders.slice().reverse();

    // 5) 각 주문 건에 대한 카드 DOM 요소 생성
    reversedOrders.forEach((order) => {
      const card = document.createElement('div');
      card.className = 'order-card';

      // --- 카드 오른쪽 상단 "취소" 버튼 ---
      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'order-cancel-btn';
      cancelBtn.textContent = '취소';
      cancelBtn.addEventListener('click', () => {
        const isConfirmed = confirm(`#${order.id} 주문을 정말 취소하시겠습니까?`);
        if (isConfirmed) {
          orders = orders.filter((item) => item.id !== order.id);
          renderOrders();
        }
      });
      card.appendChild(cancelBtn);

      // --- 1줄: "#1 홍길동님 · 5,000원" ---
      const line1 = document.createElement('div');
      line1.className = 'order-title';
      line1.textContent = `#${order.id} ${order.customerName}님 · ${order.totalPrice.toLocaleString()}원`;
      card.appendChild(line1);

      // --- 2줄: "카페라떼 M사이즈 (샷 추가) 1잔" ---
      const line2 = document.createElement('div');
      line2.className = 'order-detail';
      let optionsStr = '';
      if (order.options.length > 0) {
        optionsStr = ` (${order.options.join(', ')})`;
      }
      line2.textContent = `${order.drinkName} ${order.sizeName}사이즈${optionsStr} ${order.quantity}잔`;
      card.appendChild(line2);

      // --- 3줄: 요청사항(있을 때만) · 주문 시간 ---
      const line3 = document.createElement('div');
      line3.className = 'order-meta';
      if (order.requests) {
        line3.textContent = `요청: "${order.requests}" · ${order.orderTime}`;
      } else {
        line3.textContent = `주문 시간: ${order.orderTime}`;
      }
      card.appendChild(line3);

      orderList.appendChild(card);
    });

    // 6) 총 주문 금액 및 건수 계산하여 하단 요약 업데이트
    const totalOrderAmount = orders.reduce((sum, item) => sum + item.totalPrice, 0);
    historySummary.textContent = `총 주문 금액: ${totalOrderAmount.toLocaleString()}원 (${orders.length}건)`;
  }

  // =========================================================================
  // 6. 탭 전환 기능
  // =========================================================================
  function switchTab(activeTab) {
    if (activeTab === 'order') {
      tabOrder.classList.add('active');
      tabHistory.classList.remove('active');
      sectionOrder.classList.remove('hidden');
      sectionHistory.classList.add('hidden');
    } else if (activeTab === 'history') {
      tabHistory.classList.add('active');
      tabOrder.classList.remove('active');
      sectionHistory.classList.remove('hidden');
      sectionOrder.classList.add('hidden');
      renderOrders();
    }
  }

  tabOrder.addEventListener('click', () => switchTab('order'));
  tabHistory.addEventListener('click', () => switchTab('history'));

  // =========================================================================
  // 7. 입력값이 바뀔 때마다 실시간으로 금액 업데이트 (이벤트 연결)
  // =========================================================================
  drinkSelect.addEventListener('change', updatePriceDisplay);

  const sizeRadios = document.querySelectorAll('input[name="size"]');
  sizeRadios.forEach((radio) => {
    radio.addEventListener('change', updatePriceDisplay);
  });

  const optionCheckboxes = document.querySelectorAll('input[name="options"]');
  optionCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener('change', updatePriceDisplay);
  });

  quantityInput.addEventListener('input', updatePriceDisplay);

  // =========================================================================
  // 8. 주문하기 (form 제출) 이벤트 처리 (Supabase 연동)
  // =========================================================================
  orderForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    // 1) 이름 유효성 검사
    const customerName = nameInput.value.trim();
    if (!customerName) {
      alert('이름을 입력해주세요');
      nameInput.focus();
      return;
    }

    // 2) 음료 선택 유효성 검사
    if (!drinkSelect.value) {
      alert('음료를 선택해주세요');
      drinkSelect.focus();
      return;
    }

    // 3) 주문 정보 수집
    const customerPhone = phoneInput ? phoneInput.value.trim() : '';

    // 음료 이름 및 단가 가져오기
    const selectedDrinkOption = drinkSelect.selectedOptions[0];
    const fullDrinkText = selectedDrinkOption.textContent;
    const drinkName = fullDrinkText.split('(')[0].trim();
    const drinkPrice = Number(selectedDrinkOption.dataset.price || 0);

    // 사이즈
    const selectedSize = document.querySelector('input[name="size"]:checked');
    const sizeName = selectedSize ? selectedSize.value : 'M';

    // 수량
    const quantity = Math.max(1, Number(quantityInput.value) || 1);

    // 요청사항
    const requestText = requestsInput ? requestsInput.value.trim() : '';

    // 총 금액 계산
    const totalPrice = calculateTotal();

    // 추가 옵션 목록 (배열)
    const checkedOptions = document.querySelectorAll('input[name="options"]:checked');
    const optionNames = [];
    checkedOptions.forEach((checkbox) => {
      const label = document.querySelector(`label[for="${checkbox.id}"]`);
      if (label) {
        const optionText = label.textContent.split('(')[0].trim();
        optionNames.push(optionText);
      }
    });

    // 주문 시간 형식 생성 (예: 오후 02:35:10)
    const now = new Date();
    const orderTimeString = now.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    // 4) 주문 버튼 비활성화 (중복 클릭 방지)
    const originalBtnText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = '주문 처리 중...';

    try {
      // 5) Supabase가 설정되어 있는 경우 cafe_menu03 테이블에 저장 시도
      if (supabaseClient) {
        // 테이블에 삽입할 데이터 객체 구성
        const orderData = {
          customer_name: customerName,
          phone: customerPhone,
          drink: drinkName,
          drink_price: drinkPrice,
          size: sizeName,
          options: optionNames, // 배열 형태
          quantity: quantity,
          request: requestText,
          total_price: totalPrice,
        };

        const { data, error } = await supabaseClient
          .from('cafe_menu03')
          .insert([orderData]);

        // 에러가 발생한 경우 예외를 발생시켜 catch 블록으로 이동
        if (error) {
          throw error;
        }
      } else {
        // URL이나 KEY가 아직 비어있는 경우 콘솔에 알림 로그 남김
        console.warn('Supabase URL 또는 Key가 설정되지 않아 로컬 목록에만 주문을 기록합니다.');
      }

      // 6) 저장 성공 처리 (로컬 배열 업데이트 및 화면 출력)
      const newOrder = {
        id: nextOrderId++,
        customerName: customerName,
        drinkName: drinkName,
        sizeName: sizeName,
        options: optionNames,
        quantity: quantity,
        requests: requestText,
        totalPrice: totalPrice,
        orderTime: orderTimeString,
      };
      orders.push(newOrder);

      // 주문 내역 탭 렌더링 갱신
      renderOrders();

      // 기존 주문 확인 메시지 표시
      let optionTextPart = '';
      if (optionNames.length > 0) {
        optionTextPart = ` (${optionNames.join(', ')})`;
      }
      const confirmationMessage = `${customerName}님, ${drinkName} ${sizeName}사이즈${optionTextPart} ${quantity}잔, 총 ${totalPrice.toLocaleString()}원 주문이 접수되었습니다!`;

      confirmationArea.textContent = confirmationMessage;
      confirmationArea.hidden = false;
      confirmationArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    } catch (err) {
      // 7) 저장 실패 처리
      console.error('Supabase 주문 저장 중 에러 발생:', err);
      alert('주문 저장에 실패했어요');
    } finally {
      // 8) 주문하기 버튼 다시 활성화
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
    }
  });

  // =========================================================================
  // 9. 다시 작성 (초기화) 버튼 처리
  // =========================================================================
  resetBtn.addEventListener('click', () => {
    setTimeout(() => {
      const sizeMRadio = document.getElementById('size-m');
      if (sizeMRadio) {
        sizeMRadio.checked = true;
      }
      quantityInput.value = 1;
      updatePriceDisplay();
      confirmationArea.textContent = '';
      confirmationArea.hidden = true;
    }, 0);
  });

  // =========================================================================
  // 10. 주문 내역 모두 지우기 버튼 처리
  // =========================================================================
  clearHistoryBtn.addEventListener('click', () => {
    if (orders.length === 0) {
      alert('삭제할 주문 내역이 없습니다.');
      return;
    }

    const isConfirmed = confirm('모든 주문 내역을 삭제하시겠습니까?');
    if (isConfirmed) {
      orders = [];
      renderOrders();
    }
  });

  // =========================================================================
  // 11. 초기 상태 세팅
  // =========================================================================
  updatePriceDisplay();
  renderOrders();
});
