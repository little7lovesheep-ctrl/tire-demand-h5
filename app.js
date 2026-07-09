const BAIDU_AK = "tipOj2H6KHtBlXMR6wHxpN1jBlmIPkD0";

const state = {
  service: "换胎",
  time: "今天",
  geoCity: "",
  mapAddress: "",
  useCurrent: true,
  bMapReady: false,
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

// Geolocation - 纯浏览器原生API，不依赖第三方JS
const locationText = document.querySelector("#locationText");
const locationRetry = document.querySelector("#locationRetry");
const locationInput = document.querySelector("#locationInput");

function detectLocation() {
  locationText.textContent = "正在定位...";
  locationRetry.hidden = true;

  if (!navigator.geolocation) {
    locationFailed("您的浏览器不支持定位，请手动选择");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const lng = position.coords.longitude;
      const lat = position.coords.latitude;
      reverseGeocodeViaAPI(lng, lat);
    },
    () => {
      locationFailed("定位失败，请选择"不在当前位置"手动填写");
    },
    { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
  );
}

function reverseGeocodeViaAPI(lng, lat) {
  const url = `https://api.map.baidu.com/reverse_geocoding/v3/?ak=${BAIDU_AK}&output=json&coordtype=wgs84ll&location=${lat},${lng}&callback=handleGeoResult`;

  const script = document.createElement("script");
  script.src = url;
  script.onerror = () => {
    locationFailed("地址解析失败，请手动填写");
    script.remove();
  };
  document.head.appendChild(script);
}

window.handleGeoResult = function (data) {
  if (data && data.status === 0 && data.result) {
    const comp = data.result.addressComponent;
    const city = comp.city || comp.province || "";
    const district = comp.district || "";
    const display = district ? `${city}${district}` : city;
    if (display) {
      locationSuccess(display);
    } else {
      locationFailed("无法识别当前城市，请手动填写");
    }
  } else {
    locationFailed("地址解析失败，请手动填写");
  }
};

function locationSuccess(display) {
  state.geoCity = display;
  locationText.textContent = display;
  locationRetry.hidden = false;
}

function locationFailed(msg) {
  state.geoCity = "";
  locationText.textContent = msg;
  locationRetry.hidden = false;
}

locationRetry.addEventListener("click", detectLocation);
detectLocation();

// Map picker - 动态加载百度地图JS，仅在用户点击时加载
const mapModal = document.querySelector("#mapModal");
const mapContainer = document.querySelector("#mapContainer");
const mapResult = document.querySelector("#mapResult");
let map = null;
let mapMarker = null;

function loadBaiduMap(callback) {
  if (state.bMapReady) {
    callback();
    return;
  }
  mapResult.textContent = "地图加载中...";
  window.initBMap = function () {
    state.bMapReady = true;
    callback();
  };
  const script = document.createElement("script");
  script.src = `https://api.map.baidu.com/api?v=3.0&ak=${BAIDU_AK}&callback=initBMap`;
  script.onerror = () => {
    mapResult.textContent = "地图加载失败，请手动输入地址";
  };
  document.head.appendChild(script);
}

document.querySelector("#openMapBtn").addEventListener("click", () => {
  mapModal.classList.add("open");
  mapModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  if (!map) {
    loadBaiduMap(initMap);
  }
});

function initMap() {
  const MapLib = typeof BMapGL !== "undefined" ? BMapGL : BMap;
  map = new MapLib.Map("mapContainer");
  map.centerAndZoom(new MapLib.Point(116.404, 39.915), 13);
  map.enableScrollWheelZoom(true);
  mapResult.textContent = "点击地图选择位置";

  if (state.geoCity) {
    const geocoder = new MapLib.Geocoder();
    geocoder.getPoint(state.geoCity, (point) => {
      if (point) {
        map.centerAndZoom(point, 13);
      }
    });
  }

  map.addEventListener("click", (e) => {
    const point = e.latlng || e.point;
    if (!point) return;

    if (mapMarker) {
      mapMarker.setPosition(point);
    } else {
      mapMarker = new MapLib.Marker(point);
      map.addOverlay(mapMarker);
    }

    const geocoder = new MapLib.Geocoder();
    geocoder.getLocation(point, (result) => {
      if (result) {
        state.mapAddress = result.address;
        mapResult.textContent = result.address;
      }
    });
  });
}

document.querySelector("#closeMapBtn").addEventListener("click", closeMap);
mapModal.addEventListener("click", (e) => {
  if (e.target === mapModal) closeMap();
});

function closeMap() {
  mapModal.classList.remove("open");
  mapModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

document.querySelector("#confirmMapBtn").addEventListener("click", () => {
  if (state.mapAddress) {
    locationInput.value = state.mapAddress;
  }
  closeMap();
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
