import { AppStatus } from '@rocket.chat/apps-engine/definition/AppStatus';
import semver from 'semver';
import toastr from 'toastr';

import { t } from '../../../app/utils/client';

export const appEnabledStatuses = [
	AppStatus.AUTO_ENABLED,
	AppStatus.MANUALLY_ENABLED,
];

const appErroredStatuses = [
	AppStatus.COMPILER_ERROR_DISABLED,
	AppStatus.ERROR_DISABLED,
	AppStatus.INVALID_SETTINGS_DISABLED,
	AppStatus.INVALID_LICENSE_DISABLED,
];

export const handleAPIError = (error) => {
	console.error(error);
	const message = (error.xhr && error.xhr.responseJSON && error.xhr.responseJSON.error) || error.message;
	toastr.error(message);
};

export const warnStatusChange = (appName, status) => {
	if (appErroredStatuses.includes(status)) {
		toastr.error(t(`App_status_${ status }`), appName);
		return;
	}

	toastr.info(t(`App_status_${ status }`), appName);
};

export const appButtonProps = ({
	installed,
	version,
	marketplaceVersion,
	isPurchased,
	price,
	purchaseType,
	subscriptionInfo,
}) => {
	const canUpdate = installed
		&& version && marketplaceVersion
		&& semver.lt(version, marketplaceVersion);
	if (canUpdate) {
		return {
			action: 'update',
			icon: 'reload',
			label: 'Update',
		};
	}

	if (installed) {
		return;
	}

	const canDownload = isPurchased;
	if (canDownload) {
		return {
			action: 'install',
			label: 'Install',
		};
	}

	const canTrial = purchaseType === 'subscription' && !subscriptionInfo.status;
	if (canTrial) {
		return {
			action: 'purchase',
			label: 'Trial',
		};
	}

	const canBuy = price > 0;
	if (canBuy) {
		return {
			action: 'purchase',
			label: 'Buy',
		};
	}

	return {
		action: 'purchase',
		label: 'Install',
	};
};

export const appStatusSpanProps = ({
	installed,
	status,
	subscriptionInfo,
}) => {
	if (!installed) {
		return;
	}

	const isFailed = appErroredStatuses.includes(status);
	if (isFailed) {
		return {
			type: 'failed',
			icon: 'warning',
			label: status === AppStatus.INVALID_SETTINGS_DISABLED ? 'Config Needed' : 'Failed',
		};
	}

	const isEnabled = appEnabledStatuses.includes(status);
	if (!isEnabled) {
		return {
			type: 'warning',
			icon: 'warning',
			label: 'Disabled',
		};
	}

	const isOnTrialPeriod = subscriptionInfo && subscriptionInfo.status === 'trialing';
	if (isOnTrialPeriod) {
		return {
			icon: 'checkmark-circled',
			label: 'Trial period',
		};
	}

	return {
		icon: 'checkmark-circled',
		label: 'Enabled',
	};
};

export const formatPrice = (price) => `\$${ Number.parseFloat(price).toFixed(2) }`;

export const formatPricingPlan = ({ strategy, price, tiers = [] }) => {
	const { perUnit = false } = (Array.isArray(tiers) && tiers.find((tier) => tier.price === price)) || {};

	const pricingPlanTranslationString = [
		'Apps_Marketplace_pricingPlan',
		Array.isArray(tiers) && tiers.length > 0 && 'startingAt',
		strategy,
		perUnit && 'perUser',
	].filter(Boolean).join('_');

	return t(pricingPlanTranslationString, {
		price: formatPrice(price),
	});
};