const form = document.querySelector('#reviewForm');
const formView = document.querySelector('#formView');
const successView = document.querySelector('#successView');
const errorBox = document.querySelector('#formError');
const submitButton = document.querySelector('#submitButton');
const feedback = document.querySelector('#feedback');
const charCount = document.querySelector('#charCount');
const ratingLabels = ['非常不满意', '不太满意', '基本满意', '比较满意', '非常满意'];

feedback.addEventListener('input', () => {
  charCount.textContent = feedback.value.length;
});

document.querySelectorAll('.stars').forEach((stars) => {
  const buttons = [...stars.querySelectorAll('button')];
  const fieldName = stars.dataset.name;
  const input = form.elements[fieldName];
  const copy = stars.closest('.rating-row').querySelector('.rating-copy');

  const setRating = (value) => {
    input.value = String(value);
    buttons.forEach((button) => {
      const active = Number(button.dataset.value) <= value;
      button.classList.toggle('active', active);
      button.setAttribute('aria-checked', button.dataset.value === String(value) ? 'true' : 'false');
    });
    copy.textContent = `${value} 星 · ${fieldName === '下月续约意愿' && value === 5 ? '强烈意愿' : ratingLabels[value - 1]}`;
    stars.closest('.question').classList.remove('invalid');
  };

  buttons.forEach((button) => {
    button.setAttribute('role', 'radio');
    button.setAttribute('aria-checked', 'false');
    button.addEventListener('click', () => setRating(Number(button.dataset.value)));
    button.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault();
      const current = Number(input.value || 1);
      const next = event.key === 'ArrowRight' ? Math.min(5, current + 1) : Math.max(1, current - 1);
      setRating(next);
      buttons[next - 1].focus();
    });
  });
});

form.addEventListener('change', (event) => {
  const question = event.target.closest('.question');
  if (question) question.classList.remove('invalid');
});

function validateForm() {
  const invalid = [];
  document.querySelectorAll('[data-required]').forEach((question) => {
    const name = question.dataset.required;
    if (!form.querySelector(`[name="${name}"]:checked`)) invalid.push(question);
  });
  document.querySelectorAll('[data-rating]').forEach((question) => {
    if (!form.elements[question.dataset.rating].value) invalid.push(question);
  });
  invalid.forEach((question) => question.classList.add('invalid'));
  if (invalid.length) {
    errorBox.textContent = '请完成标有 * 的必填项目后再提交。';
    errorBox.hidden = false;
    invalid[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    return false;
  }
  errorBox.hidden = true;
  return true;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (submitButton.disabled) return;
  if (!validateForm()) return;

  const accessKey = window.RELATIONSHIP_REVIEW_CONFIG?.web3formsAccessKey?.trim();
  if (!accessKey) {
    errorBox.textContent = '问卷回传通道尚未启用，请联系恋爱关系服务中心管理员。';
    errorBox.hidden = false;
    return;
  }

  submitButton.disabled = true;
  submitButton.querySelector('span').textContent = '正在提交，请稍候';

  try {
    const formData = new FormData(form);
    const payload = {};
    for (const name of new Set(formData.keys())) {
      payload[name] = formData.getAll(name).join('；');
    }
    payload.access_key = accessKey;
    payload.subject = '2026年9月｜小猪恋爱关系用户回访';
    payload.from_name = '恋爱关系服务中心';
    payload['提交时间'] = new Date().toISOString();
    const response = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(20000)
    });
    const result = await response.json();
    if (!response.ok || result.success !== true) throw new Error('submit_failed');
    formView.hidden = true;
    successView.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (error) {
    errorBox.textContent = '暂未确认提交成功，您的填写内容仍保留在本页。请先确认是否已收到反馈邮件，再重试，以免重复提交。';
    errorBox.hidden = false;
  } finally {
    submitButton.disabled = false;
    submitButton.querySelector('span').textContent = '提交本月反馈';
  }
});
