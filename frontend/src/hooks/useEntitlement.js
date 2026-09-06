import { useState, useEffect } from 'react';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';

export const useEntitlement = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState(null);

  const fetchSubscription = async () => {
    if (!user) return;
    try {
      const res = await API.get('/subscriptions/current');
      if (res.data.success) {
        setSubscription(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch subscription status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();
  }, [user]);

  const canUse = (featureKey) => {
    if (!subscription) return true; // optimistic until loaded
    const { features, usage } = subscription;

    switch (featureKey) {
      case 'create_client':
        return (usage?.activeClients?.current || 0) < (usage?.activeClients?.limit || 10);
      case 'advanced_analytics':
        return features?.analyticsDepth === 'advanced';
      case 'soap_notes':
        return features?.noteTemplates?.includes('soap');
      case 'create_package':
        return (usage?.packagesCount?.current || 0) < (usage?.packagesCount?.limit || 1);
      default:
        return features?.[featureKey] ?? true;
    }
  };

  const triggerUpgradePrompt = (featureName) => {
    setUpgradeFeature(featureName);
    setShowUpgradeModal(true);
  };

  return {
    subscription,
    loading,
    canUse,
    showUpgradeModal,
    setShowUpgradeModal,
    upgradeFeature,
    triggerUpgradePrompt,
    refreshEntitlements: fetchSubscription,
  };
};
