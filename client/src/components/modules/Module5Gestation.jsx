import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { useI18n } from '../../i18n/I18nContext';
import AlertModal from '../AlertModal';
import ModernIcon from '../icons/ModernIcon';

const DAY_MS = 1000 * 60 * 60 * 24;

const DEFAULT_FORM_DATA = {
  mating_date: '',
  service_type: 'natural',
  farm_name: '',
  herd_lot: '',
  animal_id: '',
  breed_key: '',
  gestation_days: 150,
  history_profile: 'unknown',
  previous_births: 0,
  previous_kids: 0,
  kidding_ease: 'medium',
  doe_count: 1,
  expected_kids_per_doe: 1.7,
  pregnancy_loss_pct: 8,
  management_level: 'standard',
  reminder_window_days: 10,
  notes: '',
};

const STAGE_ILLUSTRATIONS = {
  early: '/assets/gestation/stage-early.svg',
  mid: '/assets/gestation/stage-mid.svg',
  late: '/assets/gestation/stage-late.svg',
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const asNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const dateKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const mergeFormData = (raw) => {
  const source = raw && typeof raw === 'object' ? raw : {};
  return {
    ...DEFAULT_FORM_DATA,
    ...source,
    gestation_days: clamp(Math.round(asNumber(source.gestation_days, DEFAULT_FORM_DATA.gestation_days)), 130, 170),
    previous_births: clamp(Math.round(asNumber(source.previous_births, DEFAULT_FORM_DATA.previous_births)), 0, 40),
    previous_kids: clamp(Math.round(asNumber(source.previous_kids, DEFAULT_FORM_DATA.previous_kids)), 0, 120),
    doe_count: clamp(Math.round(asNumber(source.doe_count, DEFAULT_FORM_DATA.doe_count)), 1, 5000),
    expected_kids_per_doe: clamp(asNumber(source.expected_kids_per_doe, DEFAULT_FORM_DATA.expected_kids_per_doe), 1, 4),
    pregnancy_loss_pct: clamp(asNumber(source.pregnancy_loss_pct, DEFAULT_FORM_DATA.pregnancy_loss_pct), 0, 60),
    reminder_window_days: clamp(Math.round(asNumber(source.reminder_window_days, DEFAULT_FORM_DATA.reminder_window_days)), 7, 14),
  };
};

function Module5Gestation({ user }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const isProUser = ['pro', 'pro_user', 'premium', 'admin'].includes(String(user?.role || '').toLowerCase());
  const hasModule5FullAccess = isProUser || (Array.isArray(user?.features) && (
    user.features.includes('advanced_calculations') ||
    user.features.includes('gestation_advanced')
  ));

  const [formData, setFormData] = useState(DEFAULT_FORM_DATA);
  const [calculatedData, setCalculatedData] = useState(null);
  const [breedOptions, setBreedOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alertModal, setAlertModal] = useState({ isOpen: false, message: '', type: 'success' });
  const [calendarCursor, setCalendarCursor] = useState(() => new Date());
  const [selectedStageKey, setSelectedStageKey] = useState('early');
  const [savedCases, setSavedCases] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const selectedCaseIdRef = useRef('');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  const normalizeDateForInput = useCallback((value) => {
    if (!value) return '';
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toISOString().slice(0, 10);
  }, []);

  const buildFormDataFromCase = useCallback((item) => {
    if (!item || typeof item !== 'object') return null;

    const rawFormData = item.formData && typeof item.formData === 'object'
      ? item.formData
      : {};

    const timeline = item.timelineData && typeof item.timelineData === 'object'
      ? item.timelineData
      : {};

    const fallbackData = {
      animal_id: item.animalId || '',
      service_type: item.serviceType || 'natural',
      mating_date: normalizeDateForInput(timeline.matingDate || ''),
      gestation_days: timeline.gestationDays || DEFAULT_FORM_DATA.gestation_days,
      reminder_window_days: timeline.reminderWindowDays || DEFAULT_FORM_DATA.reminder_window_days,
    };

    return mergeFormData({
      ...fallbackData,
      ...rawFormData,
      // Keep dates safe for <input type="date">
      mating_date: normalizeDateForInput(rawFormData.mating_date || fallbackData.mating_date),
    });
  }, [normalizeDateForInput]);

  const formatDate = useCallback((date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  }, []);

  const getAlertIconName = useCallback((type) => {
    switch (type) {
      case 'error': return 'bell';
      case 'warning': return 'warning';
      case 'success': return 'checkCircle';
      case 'info': return 'infoCircle';
      default: return 'fileText';
    }
  }, []);

  const getGestationStage = useCallback((dayOffset, gestationDays) => {
    const day = clamp(Math.round(asNumber(dayOffset, 0)), 0, gestationDays);

    if (day < 50) {
      return {
        key: 'early',
        name: t('earlyGestation'),
        color: '#dcfce7',
        riskColor: '#16a34a',
        riskLabel: t('module5RiskStable'),
      };
    }
    if (day < 100) {
      return {
        key: 'mid',
        name: t('midGestation'),
        color: '#fef3c7',
        riskColor: '#d97706',
        riskLabel: t('module5RiskAttention'),
      };
    }
    return {
      key: 'late',
      name: t('lateGestation'),
      color: '#fee2e2',
      riskColor: '#dc2626',
      riskLabel: t('module5RiskCritical'),
    };
  }, [t]);

  const getStageAlerts = useCallback((week) => {
    const alerts = [];
    if (week === 1) alerts.push({ type: 'info', message: t('gestationWeek1Alert') });
    if (week === 2) alerts.push({ type: 'info', message: t('gestationWeek2Alert') });
    if (week >= 3 && week <= 5) alerts.push({ type: 'success', message: t('gestationWeek3to5Alert') });
    if (week === 8) alerts.push({ type: 'warning', message: t('gestationWeek8Alert') });
    if (week === 12) alerts.push({ type: 'info', message: t('gestationWeek12Alert') });
    if (week === 15) alerts.push({ type: 'warning', message: t('gestationWeek15Alert') });
    if (week === 18) alerts.push({ type: 'error', message: t('gestationWeek18Alert') });
    if (week === 20) alerts.push({ type: 'error', message: t('gestationWeek20Alert') });
    if (week === 21 || week === 22) alerts.push({ type: 'error', message: t('gestationWeek21Alert') });
    return alerts;
  }, [t]);

  const buildOperationalEvents = useCallback((matingDate, gestationDays) => {
    const templates = [
      { id: 'service', day: 0, type: 'info', title: t('module5EventServiceTitle'), desc: t('module5EventServiceDesc') },
      { id: 'implantation', day: 14, type: 'info', title: t('module5EventImplantationTitle'), desc: t('module5EventImplantationDesc') },
      { id: 'ultrasound', day: 35, type: 'warning', title: t('module5EventUltrasoundTitle'), desc: t('module5EventUltrasoundDesc') },
      { id: 'nutritionAdjust', day: 84, type: 'warning', title: t('module5EventNutritionTitle'), desc: t('module5EventNutritionDesc') },
      { id: 'bodyCondition', day: 70, type: 'warning', title: t('module5EventBodyConditionTitle'), desc: t('module5EventBodyConditionDesc') },
      { id: 'latePrep', day: 112, type: 'warning', title: t('module5EventLatePrepTitle'), desc: t('module5EventLatePrepDesc') },
      { id: 'kiddingArea', day: gestationDays - 14, type: 'error', title: t('module5EventKiddingAreaTitle'), desc: t('module5EventKiddingAreaDesc') },
      { id: 'closeMonitor', day: gestationDays - 7, type: 'error', title: t('module5EventCloseMonitorTitle'), desc: t('module5EventCloseMonitorDesc') },
      { id: 'birthWindow', day: gestationDays, type: 'error', title: t('module5EventBirthWindowTitle'), desc: t('module5EventBirthWindowDesc') },
    ];

    const now = new Date();
    return templates
      .map((template) => {
        const dayOffset = clamp(Math.round(template.day), 0, gestationDays);
        const eventDate = new Date(matingDate);
        eventDate.setDate(eventDate.getDate() + dayOffset);
        const deltaDays = Math.floor((eventDate - now) / DAY_MS);
        let status = 'upcoming';
        if (deltaDays < 0) status = 'past';
        if (deltaDays === 0) status = 'today';
        return {
          ...template,
          dayOffset,
          date: eventDate,
          deltaDays,
          status,
        };
      })
      .sort((a, b) => a.date - b.date);
  }, [t]);

  const calculateGestationTimeline = useCallback(() => {
    if (!formData.mating_date) {
      setCalculatedData(null);
      return;
    }

    const matingDate = new Date(formData.mating_date);
    if (Number.isNaN(matingDate.getTime())) {
      setCalculatedData(null);
      return;
    }

    const gestationDays = clamp(Math.round(asNumber(formData.gestation_days, 150)), 130, 170);
    const doeCount = clamp(Math.round(asNumber(formData.doe_count, 1)), 1, 5000);
    const previousBirths = clamp(Math.round(asNumber(formData.previous_births, 0)), 0, 40);
    const previousKids = clamp(Math.round(asNumber(formData.previous_kids, 0)), 0, 120);
    const historicalKidsPerBirth = previousBirths > 0 ? previousKids / previousBirths : null;
    const modeledKidsPerDoe = Number.isFinite(historicalKidsPerBirth)
      ? clamp(historicalKidsPerBirth, 1, 4)
      : clamp(asNumber(formData.expected_kids_per_doe, 1.7), 1, 4);
    const pregnancyLossPct = clamp(asNumber(formData.pregnancy_loss_pct, 8), 0, 60);
    const reminderWindowDays = clamp(Math.round(asNumber(formData.reminder_window_days, 10)), 7, 14);
    const managementLevel = formData.management_level || 'standard';
    const historyProfile = formData.history_profile || 'unknown';
    const kiddingEase = formData.kidding_ease || 'medium';

    const birthDate = new Date(matingDate);
    birthDate.setDate(birthDate.getDate() + gestationDays);

    const today = new Date();
    const daysFromMating = Math.floor((today - matingDate) / DAY_MS);
    const currentWeek = Math.floor(daysFromMating / 7);
    const currentDayInRange = clamp(daysFromMating, 0, gestationDays);
    const daysUntilBirth = gestationDays - daysFromMating;
    const totalWeeks = Math.ceil(gestationDays / 7);

    const weeks = [];
    for (let week = 1; week <= totalWeeks; week += 1) {
      const weekStartDay = (week - 1) * 7;
      const weekEndDay = Math.min(week * 7, gestationDays);
      const weekStartDate = new Date(matingDate);
      weekStartDate.setDate(weekStartDate.getDate() + weekStartDay);
      const weekMidpointDay = Math.min(gestationDays, weekStartDay + 3);
      const stage = getGestationStage(weekMidpointDay, gestationDays);
      const alerts = getStageAlerts(week);
      weeks.push({
        week,
        startDay: weekStartDay,
        endDay: weekEndDay,
        startDate: weekStartDate,
        stage: stage.name,
        stageKey: stage.key,
        stageColor: stage.color,
        alerts,
        isCurrent: week === currentWeek || (week === currentWeek + 1 && daysFromMating % 7 > 0),
        isPast: week < currentWeek,
      });
    }

    const events = buildOperationalEvents(matingDate, gestationDays);
    const upcomingEvents = events.filter(
      (event) => (event.status === 'today' || event.status === 'upcoming') && event.deltaDays <= reminderWindowDays,
    );

    const managementFactorMap = {
      basic: 0.92,
      standard: 1,
      advanced: 1.06,
    };
    const managementFactor = managementFactorMap[managementLevel] || 1;
    const effectiveBirths = doeCount * (1 - pregnancyLossPct / 100);
    const projectedBirths = Math.max(0, effectiveBirths);
    const projectedKids = Math.max(0, projectedBirths * modeledKidsPerDoe * managementFactor);

    const riskPenalty = managementLevel === 'basic' ? 4 : managementLevel === 'advanced' ? -2 : 0;
    const historyRiskMap = { first_birth: 4, proven: 0, irregular: 6, unknown: 3 };
    const easeRiskMap = { high: -1, medium: 2, low: 5 };
    const historyRisk = historyRiskMap[historyProfile] ?? 3;
    const easeRisk = easeRiskMap[kiddingEase] ?? 2;
    const parityRisk = previousBirths === 0 ? 2 : 0;
    const urgencyPenalty = daysUntilBirth >= 0 && daysUntilBirth <= 7 ? 3 : 0;
    const riskScore = clamp(pregnancyLossPct + riskPenalty + historyRisk + easeRisk + parityRisk + urgencyPenalty, 0, 100);
    const riskBand = riskScore <= 12 ? 'low' : riskScore <= 22 ? 'medium' : 'high';
    const currentStage = getGestationStage(currentDayInRange, gestationDays);

    setCalculatedData({
      matingDate,
      birthDate,
      gestationDays,
      totalWeeks,
      currentWeek: Math.max(0, currentWeek),
      daysFromMating: Math.max(0, daysFromMating),
      currentDayInRange,
      daysUntilBirth,
      weeks,
      events,
      upcomingEvents,
      reminderWindowDays,
      isPregnant: daysFromMating >= 0 && daysFromMating <= gestationDays,
      hasGivenBirth: daysFromMating > gestationDays,
      projectedBirths,
      projectedKids,
      riskScore,
      riskBand,
      currentStage,
      historyProfile,
      kiddingEase,
      previousBirths,
      previousKids,
      managementLevel,
      doeCount,
      kidsPerDoe: modeledKidsPerDoe,
      historicalKidsPerBirth,
      pregnancyLossPct,
    });
  }, [buildOperationalEvents, formData, getStageAlerts, getGestationStage]);

  const loadBreeds = useCallback(async () => {
    try {
      const response = await api.get('/module3/breeds');
      const options = (response.data?.breeds || [])
        .map((breed) => ({
          key: String(breed?.breed_key || breed?.id || ''),
          label: String(breed?.breed_name || breed?.breed_key || '').trim(),
        }))
        .filter((breed) => breed.key && breed.label);
      setBreedOptions(options);
    } catch (error) {
      console.error('Error loading breeds for module 5:', error);
      setBreedOptions([]);
    }
  }, []);

  useEffect(() => {
    selectedCaseIdRef.current = selectedCaseId ? String(selectedCaseId) : '';
  }, [selectedCaseId]);

  const loadSavedCases = useCallback(async (preferredCaseId = null) => {
    if (!hasModule5FullAccess) {
      setSavedCases([]);
      setSelectedCaseId('');
      return;
    }
    try {
      const response = await api.get('/modules/gestation-cases');
      const cases = Array.isArray(response.data?.cases) ? response.data.cases : [];
      setSavedCases(cases);

      if (cases.length === 0) {
        setSelectedCaseId('');
        return;
      }

      const requestedId = preferredCaseId != null
        ? String(preferredCaseId)
        : selectedCaseIdRef.current;

      // Keep the selector stable: do not auto-jump to another case
      // if the user is in "new case" mode or no case is explicitly selected.
      if (!requestedId) {
        setSelectedCaseId('');
        return;
      }

      const selected = cases.find((item) => String(item.id) === requestedId);
      if (!selected) {
        setSelectedCaseId('');
        return;
      }

      setSelectedCaseId(requestedId);
      const hydratedForm = buildFormDataFromCase(selected);
      if (hydratedForm) {
        setFormData(hydratedForm);
      }
    } catch (error) {
      console.error('Error loading gestation cases:', error);
      setSavedCases([]);
      setSelectedCaseId('');
    }
  }, [buildFormDataFromCase, hasModule5FullAccess]);

  useEffect(() => {
    const initialize = async () => {
      await loadBreeds();
      await loadSavedCases();
    };
    initialize();
  }, [loadBreeds, loadSavedCases]);

  useEffect(() => {
    if (formData.mating_date) {
      const base = new Date(formData.mating_date);
      if (!Number.isNaN(base.getTime())) setCalendarCursor(new Date(base.getFullYear(), base.getMonth(), 1));
    }
  }, [formData.mating_date]);

  useEffect(() => {
    calculateGestationTimeline();
  }, [calculateGestationTimeline]);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleSave = useCallback(async () => {
    setLoading(true);
    try {
      await api.post('/modules/gestation', {
        gestationData: mergeFormData(formData),
        calculatedGestationTimeline: calculatedData,
      });
      setAlertModal({
        isOpen: true,
        message: t('dataSaved'),
        type: 'success',
      });
    } catch (error) {
      console.error('Error saving gestation data:', error);
      setAlertModal({
        isOpen: true,
        message: error.response?.data?.error || t('errorSaving'),
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [calculatedData, formData, t]);

  const handleLockedProAction = useCallback(() => {
    setAlertModal({
      isOpen: true,
      message: `${t('module5ProCopyMain')} ${t('module5ProCopySub')}`,
      type: 'info',
    });
  }, [t]);

  const handleSaveCase = useCallback(async () => {
    if (!hasModule5FullAccess) {
      handleLockedProAction();
      return;
    }
    if (!calculatedData) {
      setAlertModal({
        isOpen: true,
        message: t('module5PdfNoData'),
        type: 'info',
      });
      return;
    }
    await handleSave();
    try {
      const payloadFormData = mergeFormData(formData);
      const response = await api.post('/modules/gestation-cases', {
        animalId: (payloadFormData.animal_id || '').trim() || `Animal-${Date.now()}`,
        serviceType: payloadFormData.service_type || 'natural',
        status: 'active',
        formData: payloadFormData,
        calculatedGestationTimeline: calculatedData,
      });
      const savedId = String(response.data?.case?.id || '');
      if (savedId) {
        setSelectedCaseId(savedId);
      }
      await loadSavedCases(savedId || null);
    } catch (error) {
      console.error('Error saving gestation case:', error);
      setAlertModal({
        isOpen: true,
        message: error.response?.data?.error || t('errorSaving'),
        type: 'error',
      });
    }
  }, [calculatedData, formData, handleLockedProAction, handleSave, hasModule5FullAccess, loadSavedCases, t]);

  const handleSelectSavedCase = useCallback((caseId) => {
    if (!caseId) {
      setSelectedCaseId('');
      setFormData(mergeFormData(DEFAULT_FORM_DATA));
      return;
    }
    setSelectedCaseId(caseId);
    const selected = savedCases.find((item) => String(item.id) === String(caseId));
    const hydratedForm = buildFormDataFromCase(selected);
    if (hydratedForm) {
      setFormData(hydratedForm);
    }
  }, [buildFormDataFromCase, savedCases]);

  const handleNewAnimalCase = useCallback(() => {
    setSelectedCaseId('');
    setFormData(mergeFormData(DEFAULT_FORM_DATA));
  }, []);

  const handleViewOrEditCase = useCallback((item) => {
    if (!item) return;
    setSelectedCaseId(String(item.id));
    const hydratedForm = buildFormDataFromCase(item);
    if (hydratedForm) {
      setFormData(hydratedForm);
    }
  }, [buildFormDataFromCase]);

  const handleDeleteCase = useCallback(async (item) => {
    if (!hasModule5FullAccess) {
      handleLockedProAction();
      return;
    }
    if (!item?.id) {
      return;
    }
    try {
      await api.delete(`/modules/gestation-cases/${item.id}`);
      if (String(selectedCaseId) === String(item.id)) {
        setSelectedCaseId('');
      }
      await loadSavedCases();
      setAlertModal({
        isOpen: true,
        message: t('module5CaseDeleted'),
        type: 'success',
      });
    } catch (error) {
      setAlertModal({
        isOpen: true,
        message: error.response?.data?.error || t('module5CaseDeleteFailed'),
        type: 'error',
      });
    }
  }, [handleLockedProAction, hasModule5FullAccess, loadSavedCases, selectedCaseId, t]);

  const getAlertColor = useCallback((type) => {
    switch (type) {
      case 'error': return 'rgba(220, 38, 38, 0.1)';
      case 'warning': return 'rgba(234, 179, 8, 0.1)';
      case 'success': return 'rgba(22, 163, 74, 0.1)';
      case 'info': return 'rgba(37, 99, 235, 0.1)';
      default: return 'var(--bg-tertiary)';
    }
  }, []);

  const calendarView = useMemo(() => {
    if (!calculatedData) return { monthLabel: '', weeks: [] };
    const year = calendarCursor.getFullYear();
    const month = calendarCursor.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const firstWeekDay = first.getDay();
    const daysInMonth = last.getDate();

    const eventsByDate = calculatedData.events.reduce((acc, event) => {
      const key = dateKey(event.date);
      if (!acc[key]) acc[key] = [];
      acc[key].push(event);
      return acc;
    }, {});

    const cells = [];
    for (let i = 0; i < firstWeekDay; i += 1) {
      cells.push(null);
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, month, day);
      const key = dateKey(date);
      const events = eventsByDate[key] || [];
      const topSeverity = events.some((e) => e.type === 'error')
        ? 'error'
        : events.some((e) => e.type === 'warning')
          ? 'warning'
          : events.some((e) => e.type === 'success')
            ? 'success'
            : events.length > 0
              ? 'info'
              : 'none';
      cells.push({ date, day, events, topSeverity });
    }
    while (cells.length % 7 !== 0) cells.push(null);
    const rows = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

    return {
      monthLabel: calendarCursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
      weeks: rows,
    };
  }, [calculatedData, calendarCursor]);

  const interpretationText = useMemo(() => {
    if (!calculatedData) return null;
    const { riskBand, daysUntilBirth, projectedKids } = calculatedData;
    const kidsText = t('module5InterpretationKids', { value: projectedKids.toFixed(1) });
    if (riskBand === 'high') {
      return `${t('module5InterpretationHighRisk')} ${kidsText}`;
    }
    if (riskBand === 'medium') {
      return `${t('module5InterpretationMediumRisk')} ${kidsText}`;
    }
    if (daysUntilBirth <= 14 && daysUntilBirth >= 0) {
      return `${t('module5InterpretationCloseBirth')} ${kidsText}`;
    }
    return `${t('module5InterpretationLowRisk')} ${kidsText}`;
  }, [calculatedData, t]);

  const progressPct = useMemo(() => {
    if (!calculatedData || !calculatedData.gestationDays) return 0;
    return Math.round(clamp((calculatedData.daysFromMating / calculatedData.gestationDays) * 100, 0, 100));
  }, [calculatedData]);

  const remainingDays = useMemo(() => {
    if (!calculatedData) return 0;
    return Math.max(0, calculatedData.gestationDays - calculatedData.daysFromMating);
  }, [calculatedData]);

  const operationalStateLabel = useMemo(() => {
    if (!calculatedData) return '';
    if (calculatedData.riskBand === 'high') return t('module5OperationalStateCritical');
    if (calculatedData.riskBand === 'medium') return t('module5OperationalStateAttention');
    return t('module5OperationalStateStable');
  }, [calculatedData, t]);

  const dynamicStageMessage = useMemo(() => {
    if (!calculatedData) return '';
    const day = Math.max(0, calculatedData.daysFromMating);
    if (day < 50) return t('module5StageDynamicMessageEarly', { day });
    if (day < 100) return t('module5StageDynamicMessageMid', { day });
    return t('module5StageDynamicMessageLate', { day });
  }, [calculatedData, t]);

  const insideDoeTodayMessage = useMemo(() => {
    if (!calculatedData) return '';
    const day = Math.max(0, calculatedData.daysFromMating);
    if (day < 50) return t('module5InsideDoeEarly', { day });
    if (day < 100) return t('module5InsideDoeMid', { day });
    return t('module5InsideDoeLate', { day });
  }, [calculatedData, t]);

  const nextTenDayEvents = useMemo(() => {
    if (!calculatedData) return [];
    return calculatedData.events
      .filter((event) => event.deltaDays >= 0 && event.deltaDays <= 10)
      .sort((a, b) => a.date - b.date);
  }, [calculatedData]);

  const buildNextTenDayChecklist = useCallback((dayValue) => {
    const day = Math.max(0, Math.round(asNumber(dayValue, 0)));
    const stageActions = day < 50
      ? [t('module5ActionEarly1'), t('module5ActionEarly2')]
      : day < 100
        ? [t('module5ActionMid1'), t('module5ActionMid2')]
        : [t('module5ActionLate1'), t('module5ActionLate2')];
    return [
      t('module5ActionWater'),
      t('module5ActionBodyCondition'),
      t('module5ActionMinerals'),
      t('module5ActionBirthKit'),
      t('module5ActionStress'),
      ...stageActions,
    ].filter(Boolean);
  }, [t]);

  const nextTenDayActions = useMemo(() => {
    if (!calculatedData) return [];
    return buildNextTenDayChecklist(calculatedData.daysFromMating);
  }, [buildNextTenDayChecklist, calculatedData]);

  const getStageClinicalSignals = useCallback((stageKey) => {
    const common = [
      t('module5SignalNoAppetite'),
      t('module5SignalFever'),
      t('module5SignalIsolation'),
      t('module5SignalLameness'),
      t('module5SignalLethargy'),
    ];
    if (stageKey === 'early') return [t('module5SignalAbnormalDischarge'), ...common];
    if (stageKey === 'mid') return [t('module5SignalBodyConditionDrop'), ...common];
    return [t('module5SignalPrematureContractions'), ...common];
  }, [t]);

  const stageClinicalSignals = useMemo(() => {
    const stageKey = calculatedData?.currentStage?.key || 'early';
    return getStageClinicalSignals(stageKey);
  }, [calculatedData?.currentStage?.key, getStageClinicalSignals]);

  const getWeeklyNarrative = useCallback((week) => {
    const specific = {
      1: t('module5WeekSpecific_1'),
      8: t('module5WeekSpecific_8'),
      12: t('module5WeekSpecific_12'),
      15: t('module5WeekSpecific_15'),
      20: t('module5WeekSpecific_20'),
      21: t('module5WeekSpecific_21'),
      22: t('module5WeekSpecific_22'),
    };
    if (specific[week.week]) return specific[week.week];
    return t(`module5WeekNarrative_${week.stageKey}`, { week: week.week });
  }, [t]);

  useEffect(() => {
    if (calculatedData?.currentStage?.key) {
      setSelectedStageKey(calculatedData.currentStage.key);
    }
  }, [calculatedData?.currentStage?.key]);

  const stageTimeline = useMemo(() => {
    if (!calculatedData) return [];
    const base = [
      { key: 'early', start: 0, end: Math.min(50, calculatedData.gestationDays) },
      { key: 'mid', start: 50, end: Math.min(100, calculatedData.gestationDays) },
      { key: 'late', start: 100, end: calculatedData.gestationDays },
    ];

    return base
      .filter((stage) => stage.start <= stage.end)
      .map((stage) => {
        const stageMeta = getGestationStage(stage.start, calculatedData.gestationDays);
        return {
          ...stage,
          ...stageMeta,
          label: t(`module5StageLabel_${stage.key}`),
          isCurrent: calculatedData.currentStage?.key === stage.key,
          isSelected: selectedStageKey === stage.key,
        };
      });
  }, [calculatedData, getGestationStage, selectedStageKey, t]);

  const selectedStage = useMemo(() => {
    if (!calculatedData) return null;
    const matched = stageTimeline.find((item) => item.key === selectedStageKey);
    if (matched) return matched;
    return stageTimeline[0] || calculatedData.currentStage || null;
  }, [calculatedData, selectedStageKey, stageTimeline]);

  const selectedStagePedagogy = useMemo(() => {
    if (!selectedStage) return null;
    const key = selectedStage.key;
    return {
      physiologicalState: t(`module5Stage_${key}_physiology`),
      keyRecommendation: t(`module5Stage_${key}_recommendation`),
      nutritionDryMatter: t(`module5Stage_${key}_nutrition_dmi`),
      nutritionDiet: t(`module5Stage_${key}_nutrition_diet`),
      healthDeworming: t(`module5Stage_${key}_health_deworming`),
      healthVaccination: t(`module5Stage_${key}_health_vaccination`),
      healthVitamins: t(`module5Stage_${key}_health_vitamins`),
      managementDo: t(`module5Stage_${key}_management_do`),
      managementAvoid: t(`module5Stage_${key}_management_avoid`),
      alertsMain: t(`module5Stage_${key}_alerts_main`),
      alertsAction: t(`module5Stage_${key}_alerts_action`),
      illustration: STAGE_ILLUSTRATIONS[key],
    };
  }, [selectedStage, t]);

  const openPrintableReport = useCallback((sourceFormData, sourceTimelineData, actionList) => {
    const printWindow = window.open('', '_blank', 'width=980,height=760');
    if (!printWindow) {
      setAlertModal({
        isOpen: true,
        message: t('module5PdfPopupBlocked'),
        type: 'warning',
      });
      return;
    }

    const normalizedForm = mergeFormData(sourceFormData || {});
    const timeline = sourceTimelineData || {};
    const stageKey = timeline?.currentStage?.key || (timeline?.daysFromMating < 50 ? 'early' : timeline?.daysFromMating < 100 ? 'mid' : 'late');
    const scenarioName = (normalizedForm.animal_id || '').trim() || 'Animal';
    const printableServiceType = t(`module5ServiceTypeValue_${normalizedForm.service_type || 'natural'}`);
    const printableActions = (actionList || []).slice(0, 8).map((action) => `<li>${escapeHtml(action)}</li>`).join('');
    const printableEvents = (Array.isArray(timeline?.events) ? timeline.events : [])
      .slice(0, 8)
      .map((event) => `<li>${escapeHtml(formatDate(event.date))}: ${escapeHtml(event.title || event.desc || '')}</li>`)
      .join('');
    const stageSignals = getStageClinicalSignals(stageKey).map((signal) => `<li>${escapeHtml(signal)}</li>`).join('');

    const printableHtml = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${t('module5PdfTitle')}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #0f172a; margin: 24px; }
            h1 { margin: 0 0 8px 0; color: #0f766e; }
            h2 { margin: 18px 0 8px 0; font-size: 16px; color: #334155; }
            .meta { margin: 0 0 16px 0; color: #475569; font-size: 13px; }
            .grid { display: grid; grid-template-columns: repeat(2, minmax(220px, 1fr)); gap: 10px; }
            .card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 12px; }
            .label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: .02em; }
            .value { font-weight: 700; margin-top: 4px; font-size: 15px; }
            ul { margin: 6px 0 0 18px; }
            li { margin-bottom: 4px; }
            .notes { white-space: pre-wrap; }
            .footer { margin-top: 16px; font-size: 12px; color: #64748b; border-top: 1px solid #cbd5e1; padding-top: 10px; }
          </style>
        </head>
        <body>
          <h1>${t('module5PdfBrandTitle')}</h1>
          <p class="meta">${t('module5PdfModuleHeader')}</p>
          <h2 style="margin-top: 0;">${t('module5PdfTitle')}</h2>
          <p class="meta">${t('module5PdfGeneratedAt')}: ${new Date().toLocaleString()}</p>
          <h2>${t('module5PdfGeneralDataTitle')}</h2>
          <div class="grid">
            <div class="card"><div class="label">${t('module5FarmLabel')}</div><div class="value">${escapeHtml(normalizedForm.farm_name || t('module5PdfNotAvailable'))}</div></div>
            <div class="card"><div class="label">${t('module5HerdLotLabel')}</div><div class="value">${escapeHtml(normalizedForm.herd_lot || t('module5PdfNotAvailable'))}</div></div>
            <div class="card"><div class="label">${t('module5PdfAnimalId')}</div><div class="value">${escapeHtml(scenarioName)}</div></div>
            <div class="card"><div class="label">${t('breed')}</div><div class="value">${escapeHtml(normalizedForm.breed_key || t('module5PdfNotAvailable'))}</div></div>
            <div class="card"><div class="label">${t('module5PdfServiceType')}</div><div class="value">${escapeHtml(printableServiceType || t('module5PdfNotAvailable'))}</div></div>
            <div class="card"><div class="label">${t('matingDate')}</div><div class="value">${escapeHtml(formatDate(timeline.matingDate || normalizedForm.mating_date))}</div></div>
            <div class="card"><div class="label">${t('probableBirthDate')}</div><div class="value">${escapeHtml(formatDate(timeline.birthDate))}</div></div>
            <div class="card"><div class="label">${t('module5CurrentGestationDays')}</div><div class="value">${Number(timeline.daysFromMating || 0)} ${t('days')}</div></div>
            <div class="card"><div class="label">${t('module5PdfWeekLabel')}</div><div class="value">${Number((timeline.currentWeek || 0) + 1)}</div></div>
            <div class="card"><div class="label">${t('module5PdfStageLabel')}</div><div class="value">${escapeHtml(t(`module5StageLabel_${stageKey}`))}</div></div>
            <div class="card"><div class="label">${t('module5RiskBand')}</div><div class="value">${escapeHtml(t(`module5RiskBand_${timeline.riskBand || 'low'}`))}</div></div>
            <div class="card"><div class="label">${t('module5RiskIndex')}</div><div class="value">${Math.round(asNumber(timeline.riskScore, 0))} / 100</div></div>
          </div>

          <h2>${t('module5PdfTimelineTitle')}</h2>
          <ul>${printableEvents || `<li>${escapeHtml(t('module5NoUpcomingEvents'))}</li>`}</ul>

          <h2>${t('module5RealAlertsTitle')}</h2>
          <ul>${stageSignals}</ul>

          <h2>${t('module5Next10DaysTitle')}</h2>
          <ul>${printableActions}</ul>

          <h2>${t('notes')}</h2>
          <div class="card notes">${escapeHtml(normalizedForm.notes || t('module5PdfNoNotes'))}</div>
          <p class="footer">${t('module5VeterinaryDisclaimer')}</p>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(printableHtml);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }, [formatDate, getStageClinicalSignals, t]);

  const handleDownloadFichaPdf = useCallback(() => {
    if (!hasModule5FullAccess) {
      handleLockedProAction();
      return;
    }
    if (!calculatedData) {
      setAlertModal({
        isOpen: true,
        message: t('module5PdfNoData'),
        type: 'info',
      });
      return;
    }
    openPrintableReport(formData, calculatedData, nextTenDayActions);
  }, [calculatedData, formData, handleLockedProAction, hasModule5FullAccess, nextTenDayActions, openPrintableReport, t]);

  const handleCasePdf = useCallback((item) => {
    if (!item?.timelineData) {
      setAlertModal({
        isOpen: true,
        message: t('module5PdfNoData'),
        type: 'info',
      });
      return;
    }
    const caseForm = mergeFormData(item.formData || {});
    const actions = buildNextTenDayChecklist(item.timelineData?.daysFromMating || 0);
    openPrintableReport(caseForm, item.timelineData, actions);
  }, [buildNextTenDayChecklist, openPrintableReport, t]);

  return (
    <div className="container module-compact module5-live-root">
      <header className="module5-live-header">
        <h1 className="module5-live-title">{t('module5GestationTitle')}</h1>
        <p className="module5-live-subtitle">
          <ModernIcon name="calendar" size={16} />
          {t('module5Subtitle')}
        </p>
        <div className="pedagogy-block module5-pedagogy-block" style={{ marginTop: '12px' }}>
          <p className="pedagogy-title">{t('module5PedagogyTitle')}</p>
          <p style={{ margin: 0, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
            {t('module5PedagogyIntro')}
          </p>
          <ul className="pedagogy-list">
            <li>{t('module5FormulaBirthDate')}</li>
            <li>{t('module5FormulaDaysUntilBirth')}</li>
            <li>{t('module5InterpretationReminder')}</li>
          </ul>
        </div>
      </header>

      <div className="card module5-simulator-card">
        <h2>{t('module5LiveSimulationTitle')}</h2>
        <p className="module5-card-subtext">{t('module5LiveSimulationSubtitle')}</p>
        <p className="module5-card-subtext">{t('module5IndependentStorageNote')}</p>

        {hasModule5FullAccess && (
          <div className="module5-case-toolbar">
            <div className="module5-case-toolbar-select">
              <label>{t('module5SavedCaseSelector')}</label>
              <select
                value={selectedCaseId}
                onChange={(e) => handleSelectSavedCase(e.target.value)}
              >
                <option value="">{t('module5SavedCasePlaceholder')}</option>
                {savedCases.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.animalId} - {item.currentDay} {t('days')}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleNewAnimalCase}
            >
              {t('module5NewAnimalCase')}
            </button>
          </div>
        )}

        <div className="module5-input-grid">
          <div className="form-group">
            <label>{t('module5FarmLabel')}</label>
            <input
              type="text"
              name="farm_name"
              value={formData.farm_name}
              onChange={handleInputChange}
              placeholder={t('module5FarmPlaceholder')}
            />
            <small className="module5-field-hint">{t('module5FarmHint')}</small>
          </div>

          <div className="form-group">
            <label>{t('module5HerdLotLabel')}</label>
            <input
              type="text"
              name="herd_lot"
              value={formData.herd_lot}
              onChange={handleInputChange}
              placeholder={t('module5HerdLotPlaceholder')}
            />
            <small className="module5-field-hint">{t('module5HerdLotHint')}</small>
          </div>

          <div className="form-group">
            <label>{t('module5AnimalIdLabel')}</label>
            <input
              type="text"
              name="animal_id"
              value={formData.animal_id}
              onChange={handleInputChange}
              placeholder={t('module5AnimalIdPlaceholder')}
            />
            <small className="module5-field-hint">{t('module5AnimalIdHint')}</small>
          </div>

          <div className="form-group">
            <label>{t('breed')}</label>
            {breedOptions.length > 0 ? (
              <select name="breed_key" value={formData.breed_key} onChange={handleInputChange}>
                <option value="">{t('module5SelectBreedPlaceholder')}</option>
                {breedOptions.map((breed) => (
                  <option key={breed.key} value={breed.key}>
                    {breed.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                name="breed_key"
                value={formData.breed_key}
                onChange={handleInputChange}
                placeholder={t('module5SelectBreedPlaceholder')}
              />
            )}
            <small className="module5-field-hint">{t('module5BreedHint')}</small>
          </div>

          <div className="form-group">
            <label>{t('matingDate')}</label>
            <input type="date" name="mating_date" value={formData.mating_date} onChange={handleInputChange} />
            <small className="module5-field-hint">{t('matingDateHint')}</small>
          </div>

          <div className="form-group">
            <label>{t('module5ServiceType')}</label>
            <select name="service_type" value={formData.service_type} onChange={handleInputChange}>
              <option value="natural">{t('module5ServiceTypeNatural')}</option>
              <option value="insemination">{t('module5ServiceTypeInsemination')}</option>
              <option value="embryo_transfer">{t('module5ServiceTypeEmbryo')}</option>
              <option value="synchronized">{t('module5ServiceTypeSynchronized')}</option>
            </select>
            <small className="module5-field-hint">{t('module5ServiceTypeHint')}</small>
          </div>

          <div className="form-group">
            <label>{t('gestationDays')}</label>
            <input type="number" name="gestation_days" value={formData.gestation_days} onChange={handleInputChange} min="130" max="170" step="1" />
            <small className="module5-field-hint">{t('gestationDaysHint')}</small>
            <p className="input-hint">{t('module5GestationDaysPedagogyHint')}</p>
          </div>

          <div className="form-group">
            <label>{t('module5HistoryProfileLabel')}</label>
            <select name="history_profile" value={formData.history_profile} onChange={handleInputChange}>
              <option value="first_birth">{t('module5HistoryProfileFirstBirth')}</option>
              <option value="proven">{t('module5HistoryProfileProven')}</option>
              <option value="irregular">{t('module5HistoryProfileIrregular')}</option>
              <option value="unknown">{t('module5HistoryProfileUnknown')}</option>
            </select>
            <small className="module5-field-hint">{t('module5HistoryProfileHint')}</small>
          </div>

          <div className="form-group">
            <label>{t('module5PreviousBirthsLabel')}</label>
            <input type="number" name="previous_births" value={formData.previous_births} onChange={handleInputChange} min="0" max="40" step="1" />
            <small className="module5-field-hint">{t('module5PreviousBirthsHint')}</small>
          </div>

          <div className="form-group">
            <label>{t('module5PreviousKidsLabel')}</label>
            <input type="number" name="previous_kids" value={formData.previous_kids} onChange={handleInputChange} min="0" max="120" step="1" />
            <small className="module5-field-hint">{t('module5PreviousKidsHint')}</small>
          </div>

          <div className="form-group">
            <label>{t('module5KiddingEaseLabel')}</label>
            <select name="kidding_ease" value={formData.kidding_ease} onChange={handleInputChange}>
              <option value="high">{t('module5KiddingEaseHigh')}</option>
              <option value="medium">{t('module5KiddingEaseMedium')}</option>
              <option value="low">{t('module5KiddingEaseLow')}</option>
            </select>
            <small className="module5-field-hint">{t('module5KiddingEaseHint')}</small>
          </div>

          <div className="form-group">
            <label>{t('module5ReminderWindow')}</label>
            <select name="reminder_window_days" value={formData.reminder_window_days} onChange={handleInputChange}>
              <option value="7">7 {t('days')}</option>
              <option value="10">10 {t('days')}</option>
              <option value="14">14 {t('days')}</option>
            </select>
            <small className="module5-field-hint">{t('module5ReminderWindowHint')}</small>
          </div>
        </div>

        {hasModule5FullAccess && (
          <div className="module5-advanced-wrap">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setShowAdvancedOptions((prev) => !prev)}
            >
              {showAdvancedOptions ? t('module5HideAdvancedOptions') : t('module5ShowAdvancedOptions')}
            </button>
            {showAdvancedOptions && (
              <div className="module5-input-grid" style={{ marginTop: '10px' }}>
                <div className="form-group">
                  <label>{t('module5DoeCount')}</label>
                  <input type="number" name="doe_count" value={formData.doe_count} onChange={handleInputChange} min="1" max="5000" step="1" />
                  <small className="module5-field-hint">{t('module5DoeCountHint')}</small>
                </div>

                <div className="form-group">
                  <label>{t('module5KidsPerDoe')}</label>
                  <input type="number" name="expected_kids_per_doe" value={formData.expected_kids_per_doe} onChange={handleInputChange} min="1" max="4" step="0.1" />
                  <small className="module5-field-hint">{t('module5KidsPerDoeHint')}</small>
                </div>

                <div className="form-group">
                  <label>{t('module5PregnancyLoss')}</label>
                  <input type="number" name="pregnancy_loss_pct" value={formData.pregnancy_loss_pct} onChange={handleInputChange} min="0" max="60" step="0.5" />
                  <small className="module5-field-hint">{t('module5PregnancyLossHint')}</small>
                </div>

                <div className="form-group">
                  <label>{t('module5ManagementLevel')}</label>
                  <select name="management_level" value={formData.management_level} onChange={handleInputChange}>
                    <option value="basic">{t('module5ManagementBasic')}</option>
                    <option value="standard">{t('module5ManagementStandard')}</option>
                    <option value="advanced">{t('module5ManagementAdvanced')}</option>
                  </select>
                  <small className="module5-field-hint">{t('module5ManagementLevelHint')}</small>
                </div>
              </div>
            )}
          </div>
        )}

            <div className="form-group" style={{ marginTop: '15px' }}>
              <label>{t('notes')} ({t('optional')})</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows="3"
                placeholder={t('gestationNotesPlaceholder')}
                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)' }}
              />
            </div>

            <div className="module5-primary-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleSaveCase}
                disabled={loading}
              >
                {loading ? t('saving') : t('module5SaveCase')}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleDownloadFichaPdf}
              >
                {t('module5DownloadPdf')}
              </button>
            </div>
          </div>

          {calculatedData && (
            <>
              <div className="card">
                <h2>{t('module5PredictiveOverviewTitle')}</h2>
                <div className="module5-metric-grid">
                  <article className="module5-metric-card module5-metric-card--blue">
                    <span>{t('matingDate')}</span>
                    <strong>{formatDate(calculatedData.matingDate)}</strong>
                  </article>
                  <article className="module5-metric-card module5-metric-card--green">
                    <span>{t('probableBirthDate')}</span>
                    <strong>{formatDate(calculatedData.birthDate)}</strong>
                  </article>
                  <article className="module5-metric-card module5-metric-card--amber">
                    <span>{t('module5CurrentGestationDays')}</span>
                    <strong>{calculatedData.daysFromMating} {t('days')}</strong>
                  </article>
                  <article className="module5-metric-card module5-metric-card--teal">
                    <span>{t('module5OperationalState')}</span>
                    <strong>{operationalStateLabel}</strong>
                  </article>
                  <article className="module5-metric-card module5-metric-card--violet">
                    <span>{t('module5BirthPreparation')}</span>
                    <strong>{progressPct}%</strong>
                  </article>
                  <article className="module5-metric-card module5-metric-card--teal">
                    <span>{t('module5PdfWeekLabel')}</span>
                    <strong>{Math.max(1, Number(calculatedData.currentWeek) + 1)}</strong>
                  </article>
                  <article className="module5-metric-card module5-metric-card--blue">
                    <span>{t('module5PdfStageLabel')}</span>
                    <strong>{t(`module5StageLabel_${calculatedData.currentStage?.key || 'early'}`)}</strong>
                  </article>
                  <article className="module5-metric-card module5-metric-card--rose" title={t('module5RiskTooltip')}>
                    <span>{t('module5RiskBand')}</span>
                    <strong>{t(`module5RiskBand_${calculatedData.riskBand}`)}</strong>
                  </article>
                  <article className="module5-metric-card module5-metric-card--amber">
                    <span>{t('module5RiskIndex')}</span>
                    <strong>{Math.round(calculatedData.riskScore)} / 100</strong>
                  </article>
                  {hasModule5FullAccess && (
                    <>
                      <article className="module5-metric-card module5-metric-card--blue">
                        <span>{t('module5ProjectedBirths')}</span>
                        <strong>{calculatedData.projectedBirths.toFixed(1)}</strong>
                      </article>
                      <article className="module5-metric-card module5-metric-card--green">
                        <span>{t('module5ProjectedKids')}</span>
                        <strong>{calculatedData.projectedKids.toFixed(1)}</strong>
                      </article>
                    </>
                  )}
                </div>
                <p className="module5-interpretation-line">{dynamicStageMessage}</p>
                {hasModule5FullAccess && <p className="module5-interpretation-line">{interpretationText}</p>}
              </div>

              {!hasModule5FullAccess && (
                <div className="card">
                  <h2>{t('availableForProUsers')}</h2>
                  <p className="module5-card-subtext">{t('module5ProCopyMain')}</p>
                  <p className="module5-card-subtext">{t('module5ProCopySub')}</p>
                  <div className="blocked-preview-grid" style={{ marginTop: '12px', marginBottom: '14px' }}>
                    <div className="blocked-preview-card">
                      <h4>{t('module5LockedFeatureTimeline')}</h4>
                    </div>
                    <div className="blocked-preview-card">
                      <h4>{t('module5LockedFeatureManagement')}</h4>
                    </div>
                    <div className="blocked-preview-card">
                      <h4>{t('module5LockedFeatureAdvanced')}</h4>
                    </div>
                  </div>
                  <button type="button" className="btn btn-primary" onClick={() => navigate('/profile')}>
                    {t('module5ProLockCta')}
                  </button>
                </div>
              )}

              <div className="card">
                <h2>{t('gestationProgress')}</h2>
                <div className="module5-progress-track">
                  <div
                    className="module5-progress-fill"
                    style={{ width: `${progressPct}%` }}
                  >
                    {progressPct}%
                  </div>
                  <div className="module5-progress-marker" style={{ left: `${progressPct}%` }}>
                    <span>{t('module5TodayMarker')}</span>
                  </div>
                </div>
                <p className="module5-progress-caption">
                  {calculatedData.daysFromMating} / {calculatedData.gestationDays} {t('days')}
                </p>
                <p className="module5-progress-caption module5-progress-caption-secondary">
                  {t('module5DaysRemaining', { days: remainingDays })}
                </p>
              </div>

              {!hasModule5FullAccess && (
                <>
                  <div className="card">
                    <h2>{t('module5BasicTimelineTitle')}</h2>
                    <p className="module5-card-subtext">{t('module5BasicTimelineSubtitle')}</p>
                    <div className="module5-basic-stage-row">
                      {stageTimeline.map((stage) => (
                        <div
                          key={stage.key}
                          className={`module5-basic-stage-pill ${stage.isCurrent ? 'is-current' : ''}`}
                          style={{ '--stage-accent': stage.riskColor }}
                        >
                          <strong>{stage.label}</strong>
                          <span>{stage.start}-{stage.end} {t('days')}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="card">
                    <h2>{t('module5InsideDoeTodayTitle')}</h2>
                    <p className="module5-inside-doe-text">{insideDoeTodayMessage}</p>
                  </div>
                </>
              )}

              {hasModule5FullAccess && (
                <>
                  <div className="card module5-stage-card">
                    <h2>{t('module5StageTimelineTitle')}</h2>
                    <p className="module5-card-subtext">{t('module5StageTimelineSubtitle')}</p>

                    <div className="module5-stage-timeline">
                      {stageTimeline.map((stage) => (
                        <button
                          key={stage.key}
                          type="button"
                          className={`module5-stage-chip ${stage.isCurrent ? 'is-current' : ''} ${stage.isSelected ? 'is-selected' : ''}`}
                          style={{ '--stage-accent': stage.riskColor }}
                          onClick={() => setSelectedStageKey(stage.key)}
                        >
                          <strong>{stage.label}</strong>
                          <span>{stage.start}-{stage.end} {t('days')}</span>
                        </button>
                      ))}
                    </div>

                    {selectedStage && selectedStagePedagogy && (
                      <div className="module5-stage-content">
                        <div className="module5-stage-illustration-wrap">
                          <img
                            src={selectedStagePedagogy.illustration}
                            alt={t(`module5StageIllustrationAlt_${selectedStage.key}`)}
                            className="module5-stage-illustration"
                          />
                          <span className="module5-stage-risk-badge" style={{ background: selectedStage.riskColor }}>
                            {selectedStage.riskLabel}
                          </span>
                        </div>

                        <div className="module5-stage-details">
                          <p className="module5-stage-physiology">
                            <strong>{t('module5PhysiologicalStateLabel')}:</strong> {selectedStagePedagogy.physiologicalState}
                          </p>
                          <p className="module5-stage-recommendation">
                            <strong>{t('module5KeyRecommendationLabel')}:</strong> {selectedStagePedagogy.keyRecommendation}
                          </p>

                          <div className="module5-stage-grid">
                            <article className="module5-stage-topic module5-stage-topic--nutrition">
                              <h3>{t('nutrition')}</h3>
                              <ul>
                                <li>{selectedStagePedagogy.nutritionDryMatter}</li>
                                <li>{selectedStagePedagogy.nutritionDiet}</li>
                              </ul>
                            </article>

                            <article className="module5-stage-topic module5-stage-topic--health">
                              <h3>{t('healthMonitoring')}</h3>
                              <ul>
                                <li>{selectedStagePedagogy.healthDeworming}</li>
                                <li>{selectedStagePedagogy.healthVaccination}</li>
                                <li>{selectedStagePedagogy.healthVitamins}</li>
                              </ul>
                            </article>

                            <article className="module5-stage-topic module5-stage-topic--management">
                              <h3>{t('module5ManagementLabel')}</h3>
                              <ul>
                                <li>{selectedStagePedagogy.managementDo}</li>
                                <li>{selectedStagePedagogy.managementAvoid}</li>
                              </ul>
                            </article>

                            <article className="module5-stage-topic module5-stage-topic--alerts">
                              <h3>{t('module5AlertsLabel')}</h3>
                              <ul>
                                <li>{selectedStagePedagogy.alertsMain}</li>
                                <li>{selectedStagePedagogy.alertsAction}</li>
                              </ul>
                            </article>
                          </div>
                        </div>
                      </div>
                    )}

                    <p className="module5-legal-note">{t('module5VeterinaryDisclaimer')}</p>
                  </div>

                  <div className="card">
                    <div className="module5-calendar-header">
                      <h2>{t('module5CalendarTitle')}</h2>
                      <div className="module5-calendar-nav">
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setCalendarCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                        >
                          {t('previous')}
                        </button>
                        <strong>{calendarView.monthLabel}</strong>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => setCalendarCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                        >
                          {t('next')}
                        </button>
                      </div>
                    </div>
                    <p className="module5-card-subtext">{t('module5CalendarSubtitle')}</p>
                    <div className="module5-calendar-grid">
                      {[t('module5WeekdaySun'), t('module5WeekdayMon'), t('module5WeekdayTue'), t('module5WeekdayWed'), t('module5WeekdayThu'), t('module5WeekdayFri'), t('module5WeekdaySat')].map((label) => (
                        <div key={label} className="module5-calendar-weekday">{label}</div>
                      ))}
                      {calendarView.weeks.flat().map((cell, idx) => {
                        if (!cell) return <div key={`empty-${idx}`} className="module5-calendar-cell module5-calendar-cell--empty" />;
                        return (
                          <div
                            key={dateKey(cell.date)}
                            className={`module5-calendar-cell module5-calendar-cell--${cell.topSeverity}`}
                            title={cell.events.map((event) => `${event.title}`).join(' | ')}
                          >
                            <div className="module5-calendar-day">{cell.day}</div>
                            {cell.events.length > 0 && (
                              <div className="module5-calendar-events">
                                <span className="module5-calendar-event-count">{cell.events.length}</span>
                                <span className="module5-calendar-event-label">{t('module5CalendarEventsShort')}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="module5-calendar-feed">
                      <h3>{t('module5CalendarFeedTitle')}</h3>
                      <div className="module5-calendar-feed-list">
                        {calculatedData.events.map((event) => (
                          <article key={`calendar-feed-${event.id}`} className={`module5-calendar-feed-item module5-calendar-feed-item--${event.type}`}>
                            <strong>{formatDate(event.date)}</strong>
                            <p>{event.title}</p>
                          </article>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <h2>{t('module5Next10DaysTitle')}</h2>
                    <p className="module5-card-subtext">{t('module5Next10DaysSubtitle')}</p>
                    <div className="module5-next10-checklist">
                      {nextTenDayActions.map((action) => (
                        <div key={action} className="module5-next10-item">
                          <ModernIcon name="checkCircle" size={13} />
                          <span>{action}</span>
                        </div>
                      ))}
                    </div>
                    {nextTenDayEvents.length === 0 ? (
                      <p className="module5-empty-text">{t('module5NoUpcomingEvents')}</p>
                    ) : (
                      <div className="module5-upcoming-list">
                        {nextTenDayEvents.map((event) => (
                          <article key={event.id} className={`module5-upcoming-item module5-upcoming-item--${event.type}`}>
                            <div className="module5-upcoming-icon">
                              <ModernIcon name={getAlertIconName(event.type)} size={14} />
                            </div>
                            <div>
                              <h3>{event.title}</h3>
                              <p>{event.desc}</p>
                              <small>
                                {formatDate(event.date)} - {event.status === 'today' ? t('module5EventToday') : t('module5EventInDays', { days: event.deltaDays })}
                              </small>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="card">
                    <h2>{t('module5RealAlertsTitle')}</h2>
                    <p className="module5-card-subtext">{t('module5RealAlertsSubtitle')}</p>
                    <ul className="module5-clinical-list">
                      {stageClinicalSignals.map((signal) => (
                        <li key={signal}>{signal}</li>
                      ))}
                    </ul>
                    <p className="module5-legal-note">{t('module5VeterinaryDisclaimer')}</p>
                  </div>

                  <div className="card">
                    <h2>{t('weeklyTimeline')}</h2>
                    <p style={{ color: 'var(--text-tertiary)', marginBottom: '20px' }}>{t('weeklyTimelineDescription')}</p>
                    <div style={{ display: 'grid', gap: '15px' }}>
                      {calculatedData.weeks.map((week) => (
                        <div
                          key={week.week}
                          style={{
                            padding: '15px',
                            background: week.isCurrent ? 'rgba(234, 179, 8, 0.15)' : week.isPast ? 'var(--bg-tertiary)' : week.stageColor,
                            borderRadius: '8px',
                            border: week.isCurrent ? '3px solid var(--accent-warning)' : '1px solid var(--border-color)',
                            opacity: week.isPast ? 0.65 : 1,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <div>
                              <h3 style={{ margin: 0, fontSize: '1.05em' }}>
                                {week.isCurrent && (
                                  <span style={{ display: 'inline-flex', alignItems: 'center', marginRight: '6px', color: 'var(--accent-warning)' }}>
                                    <ModernIcon name="mapPin" size={14} />
                                  </span>
                                )}
                                {t('week')} {week.week}{week.isCurrent ? ` (${t('current')})` : ''}
                              </h3>
                              <p style={{ margin: '5px 0 0 0', fontSize: '0.9em', color: 'var(--text-tertiary)' }}>
                                {formatDate(week.startDate)} - {t('days')} {week.startDay}-{week.endDay}
                              </p>
                            </div>
                            <div style={{ padding: '6px 12px', background: 'var(--bg-secondary)', borderRadius: '4px', fontSize: '0.85em', fontWeight: 700 }}>
                              {week.stage}
                            </div>
                          </div>
                          <p className="module5-week-narrative">
                            {getWeeklyNarrative(week)}
                          </p>
                          {week.alerts.length > 0 && (
                            <div style={{ marginTop: '10px' }}>
                              {week.alerts.map((alert, idx) => (
                                <div
                                  key={`${week.week}-${idx}`}
                                  style={{
                                    padding: '10px',
                                    background: getAlertColor(alert.type),
                                    borderRadius: '4px',
                                    marginTop: idx > 0 ? '8px' : 0,
                                    border: `1px solid ${alert.type === 'error' ? 'var(--accent-error)' : alert.type === 'warning' ? 'var(--accent-warning)' : 'var(--border-color)'}`,
                                  }}
                                >
                                  <p style={{ margin: 0, fontSize: '0.9em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <ModernIcon name={getAlertIconName(alert.type)} size={14} />
                                    <span>{alert.message}</span>
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="card">
                    <h2>{t('module5InsideDoeTodayTitle')}</h2>
                    <p className="module5-inside-doe-text">{insideDoeTodayMessage}</p>
                  </div>

                  <div className="card">
                    <h2>{t('generalCareChecklist')}</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '15px' }}>
                      <div style={{ padding: '15px', background: '#e3f2fd', borderRadius: '8px' }}>
                        <h3 style={{ marginTop: 0, fontSize: '1em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <ModernIcon name="leaf" size={14} />
                          {t('nutrition')}
                        </h3>
                        <ul style={{ marginLeft: '20px', lineHeight: '1.8' }}>
                          <li>{t('nutritionItem1')}</li>
                          <li>{t('nutritionItem2')}</li>
                          <li>{t('nutritionItem3')}</li>
                        </ul>
                      </div>
                      <div style={{ padding: '15px', background: '#fff3e0', borderRadius: '8px' }}>
                        <h3 style={{ marginTop: 0, fontSize: '1em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <ModernIcon name="heartPulse" size={14} />
                          {t('healthMonitoring')}
                        </h3>
                        <ul style={{ marginLeft: '20px', lineHeight: '1.8' }}>
                          <li>{t('healthItem1')}</li>
                          <li>{t('healthItem2')}</li>
                          <li>{t('healthItem3')}</li>
                        </ul>
                      </div>
                      <div style={{ padding: '15px', background: '#e8f5e9', borderRadius: '8px' }}>
                        <h3 style={{ marginTop: 0, fontSize: '1em', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <ModernIcon name="home" size={14} />
                          {t('environment')}
                        </h3>
                        <ul style={{ marginLeft: '20px', lineHeight: '1.8' }}>
                          <li>{t('environmentItem1')}</li>
                          <li>{t('environmentItem2')}</li>
                          <li>{t('environmentItem3')}</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <h2>{t('module5SavedCasesTitle')}</h2>
                    <p className="module5-card-subtext">{t('module5SavedCasesSubtitle')}</p>
                    {savedCases.length === 0 ? (
                      <p className="module5-empty-text">{t('module5SavedCasesEmpty')}</p>
                    ) : (
                      <div className="module5-history-table-wrap">
                        <table className="module5-history-table">
                          <thead>
                            <tr>
                              <th>{t('module5FarmLabel')}</th>
                              <th>{t('module5HerdLotLabel')}</th>
                              <th>{t('module5HistoryAnimal')}</th>
                              <th>{t('module5HistoryCurrentDay')}</th>
                              <th>{t('module5HistoryProbableBirth')}</th>
                              <th>{t('module5HistoryStatus')}</th>
                              <th>{t('module5RiskBand')}</th>
                              <th>{t('module5HistoryActions')}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {savedCases.map((item) => (
                              <tr key={`saved-case-${item.id}`}>
                                <td>{item?.formData?.farm_name || '-'}</td>
                                <td>{item?.formData?.herd_lot || '-'}</td>
                                <td>{item.animalId}</td>
                                <td>{item.currentDay}</td>
                                <td>{item.probableBirthDate ? formatDate(item.probableBirthDate) : '-'}</td>
                                <td>{item.status === 'active' ? t('module5CaseStatusActive') : t('module5CaseStatusArchived')}</td>
                                <td>{item?.riskBand ? t(`module5RiskBand_${item.riskBand}`) : '-'}</td>
                                <td>
                                  <div className="module5-history-actions">
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleViewOrEditCase(item)}>
                                      {t('module5HistoryActionView')}
                                    </button>
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleViewOrEditCase(item)}>
                                      {t('module5HistoryActionEdit')}
                                    </button>
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleCasePdf(item)}>
                                      {t('module5HistoryActionPdf')}
                                    </button>
                                    <button type="button" className="btn btn-danger btn-sm" onClick={() => handleDeleteCase(item)}>
                                      {t('module5HistoryActionDelete')}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}

      <AlertModal
        isOpen={alertModal.isOpen}
        onClose={() => setAlertModal((prev) => ({ ...prev, isOpen: false }))}
        title={alertModal.type === 'success' ? t('success') : alertModal.type === 'error' ? t('error') : t('information')}
        message={alertModal.message}
        type={alertModal.type}
      />
    </div>
  );
}

export default Module5Gestation;
