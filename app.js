const state = {
  service: "换胎",
  time: "今天",
  geoCity: "",
  mapAddress: "",
  useCurrent: true,
  bMapReady: false,
};

// Baidu Map async callback
window.onBMapLoaded = function () {
  state.bMapReady = true;
  detectLocation();
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

// Geolocation via Baidu Map
const locationText = document.querySelector("#locationText");
const locationRetry = document.querySelector("#locationRetry");
const locationInput = document.querySelector("#locationInput");

function detectLocation() {
  locationText.textContent = "正在定位...";
  locationRetry.hidden = true;

  if (!state.bMapReady) {
    fallbackBrowserGeo();
    return;
  }

  const MapLib = typeof BMapGL !== "undefined" ? BMapGL : BMap;
  const geolocation = new MapLib.Geolocation();

  geolocation.getCurrentPosition(function (r) {
    if (this.getStatus() === 0) {
      const point = r.point;
      reverseGeocodeBaidu(point.lng, point.lat);
    } else {
      fallbackBrowserGeo();
    }
  });
}

function fallbackBrowserGeo() {
  if (!navigator.geolocation) {
    locationFailed("定位失败，请手动填写或在地图上选择");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      reverseGeocodeBaidu(position.coords.longitude, position.coords.latitude);
    },
    () => {
      locationFailed("定位失败，请手动填写或在地图上选择");
    },
    { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
  );
}

function reverseGeocodeBaidu(lng, lat) {
  const MapLib = typeof BMapGL !== "undefined" ? BMapGL : BMap;
  const geocoder = new MapLib.Geocoder();
  const point = new MapLib.Point(lng, lat);

  geocoder.getLocation(point, (result) => {
    if (result) {
      const city = result.addressComponents.city || "";
      const district = result.addressComponents.district || "";
      const display = district ? `${city}${district}` : city;
      if (display) {
        locationSuccess(display);
      } else {
        locationFailed("无法识别当前城市，请手动填写");
      }
    } else {
      locationFailed("无法识别当前城市，请手动填写");
    }
  });
}

function locationSuccess(display) {
  state.geoCity = display;
  locationText.textContent = display;
  locationRetry.hidden = false;
}

function locationFailed(msg) {
  state.geoCity = "";
  locationText.textContent = msg;
  locationRetry.hidden = false;
  // 定位失败时自动展开手动输入
  useOtherBtn.click();
}

locationRetry.addEventListener("click", detectLocation);

// 如果百度地图5秒内没加载好，走浏览器原生定位
setTimeout(() => {
  if (!state.bMapReady && !state.geoCity) {
    fallbackBrowserGeo();
  }
}, 5000);

// Map picker (Baidu Map)
const mapModal = document.querySelector("#mapModal");
const mapContainer = document.querySelector("#mapContainer");
const mapResult = document.querySelector("#mapResult");
let map = null;
let mapMarker = null;

document.querySelector("#openMapBtn").addEventListener("click", () => {
  mapModal.classList.add("open");
  mapModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";

  if (!map && state.bMapReady) {
    const MapLib = typeof BMapGL !== "undefined" ? BMapGL : BMap;
    map = new MapLib.Map("mapContainer");
    map.centerAndZoom(new MapLib.Point(116.404, 39.915), 13);
    map.enableScrollWheelZoom(true);

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
  } else if (!map && !state.bMapReady) {
    mapResult.textContent = "地图服务暂不可用，请手动输入地址";
  }
});

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
});
