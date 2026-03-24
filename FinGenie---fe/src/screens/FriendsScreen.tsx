import React from 'react';
import { useI18n } from '../i18n/useI18n';
import { SocialScreen } from './SocialScreen';

export function FriendsScreen() {
  const { t } = useI18n();

  return (
    <SocialScreen
      headerTitleOverride={t('screen.friends')}
      initialTab="FRIENDS"
    />
  );
}
