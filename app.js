const state = {
  service: "换胎",
  time: "今天",
  geoCity: "",
  useCurrent: true,
};

function selectExclusive(buttons, selectedButton) {
  buttons.forEach((button) => {
    const active = button === selectedButton;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

const serviceButtons = [...document.querySelectorAll("[data-service]")];
serviceButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectExclusive(serviceButtons, button);
    state.service = button.dataset.service;
  });
});

const timeButtons = [...document.querySelectorAll("[data-time]")];
timeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectExclusive(timeButtons, button);
    state.time = button.dataset.time;
  });
});

// Location toggle
const useCurrentBtn = document.querySelector("#useCurrentBtn");
const useOtherBtn = document.querySelector("#useOtherBtn");
const locationOther = document.querySelector("#locationOther");
const locationText = document.querySelector("#locationText");
const locationRetry = document.querySelector("#locationRetry");
const locationInput = document.querySelector("#locationInput");

locationText.textContent = "点击获取当前位置";
locationRetry.hidden = true;

useCurrentBtn.addEventListener("click", () => {
  state.useCurrent = true;
  useCurrentBtn.classList.add("active");
  useCurrentBtn.setAttribute("aria-pressed", "true");
  useOtherBtn.classList.remove("active");
  useOtherBtn.setAttribute("aria-pressed", "false");
  locationOther.hidden = true;
});

useOtherBtn.addEventListener("click", () => {
  state.useCurrent = false;
  useOtherBtn.classList.add("active");
  useOtherBtn.setAttribute("aria-pressed", "true");
  useCurrentBtn.classList.remove("active");
  useCurrentBtn.setAttribute("aria-pressed", "false");
  locationOther.hidden = false;
});

// 点击定位区域手动触发定位
document.querySelector("#locationCurrent").addEventListener("click", () => {
  if (state.geoCity) return;
  locationText.textContent = "正在定位...";
  if (!navigator.geolocation) {
    locationText.textContent = "浏览器不支持定位，请手动选择";
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (position) => {
      state.geoCity = `${position.coords.latitude.toFixed(2)},${position.coords.longitude.toFixed(2)}`;
      locationText.textContent = "定位成功（坐标已获取）";
    },
    () => {
      locationText.textContent = "定位失败，请选择"不在当前位置"手动填写";
    },
    { enableHighAccuracy: false, timeout: 6000, maximumAge: 300000 }
  );
});

// Toast
const toast = document.querySelector("#toast");
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}

// Success Modal
const successModal = document.querySelector("#successModal");

function openModal() {
  successModal.classList.add("open");
  successModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  successModal.classList.remove("open");
  successModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

document.querySelector("#closeModal").addEventListener("click", closeModal);
successModal.addEventListener("click", (event) => {
  if (event.target === successModal) closeModal();
});

// Submit
document.querySelector("#intentForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const phoneInput = document.querySelector("#driverPhone");
  const phone = phoneInput.value.trim();

  if (!/^1\d{10}$/.test(phone)) {
    showToast("请输入正确的11位手机号");
    phoneInput.focus();
    return;
  }

  let location = "";
  if (state.useCurrent) {
    location = state.geoCity || "";
    if (!location) {
      showToast("定位未成功，请选择"不在当前位置"手动填写");
      return;
    }
  } else {
    location = locationInput.value.trim();
    if (!location) {
      showToast("请填写期望服务的区域或在地图上选择");
      locationInput.focus();
      return;
    }
  }

  const submitBtn = document.querySelector("#submitButton");
  submitBtn.disabled = true;
  submitBtn.textContent = "提交中...";

  const payload = {
    service: state.service,
    phone: phone,
    time: state.time,
    location: location,
  };

  fetch("/api/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        const details = [
          ["服务类型", state.service],
          ["联系电话", phone],
          ["预计时间", state.time],
          ["服务区域", location],
        ];
        document.querySelector("#bookingResult").innerHTML = details
          .map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`)
          .join("");
        openModal();
      } else {
        showToast(data.error || "提交失败，请重试");
      }
    })
    .catch(() => {
      showToast("网络异常，请重试");
    })
    .finally(() => {
      submitBtn.disabled = false;
      submitBtn.textContent = "免费获取报价";
    });
});
