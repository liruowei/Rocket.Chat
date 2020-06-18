import moment from 'moment';

import { ILivechatBusinessHour } from '../../../../definition/ILivechatBusinessHour';
import {
	IWorkHoursForCreateCronJobs, LivechatBusinessHoursRaw,
} from '../../../models/server/raw/LivechatBusinessHours';
import { UsersRaw } from '../../../models/server/raw/Users';
import { LivechatBusinessHours, Users } from '../../../models/server/raw';

export interface IBusinessHour {
	saveBusinessHour(businessHourData: ILivechatBusinessHour): Promise<void>;
	allowAgentChangeServiceStatus(agentId: string): Promise<boolean>;
	getBusinessHour(id: string): Promise<ILivechatBusinessHour>;
	findHoursToCreateJobs(): Promise<IWorkHoursForCreateCronJobs[]>;
	openBusinessHoursByDayHourAndUTC(day: string, hour: string, utc: string): Promise<void>;
	closeBusinessHoursByDayAndHour(day: string, hour: string, utc: string): Promise<void>;
	removeBusinessHoursFromUsers(): Promise<void>;
	removeBusinessHourById(id: string): Promise<void>;
	openBusinessHoursIfNeeded(): Promise<void>;
}

export abstract class AbstractBusinessHour {
	protected BusinessHourRepository: LivechatBusinessHoursRaw = LivechatBusinessHours;

	protected UsersRepository: UsersRaw = Users;

	async findHoursToCreateJobs(): Promise<IWorkHoursForCreateCronJobs[]> {
		return this.BusinessHourRepository.findHoursToScheduleJobs();
	}

	async allowAgentChangeServiceStatus(agentId: string): Promise<boolean> {
		return this.UsersRepository.isAgentWithinBusinessHours(agentId);
	}

	async removeBusinessHoursFromUsers(): Promise<void> {
		await this.UsersRepository.removeBusinessHoursFromUsers();
		await this.UsersRepository.updateLivechatStatusBasedOnBusinessHours();
	}

	async openBusinessHoursIfNeeded(): Promise<void> {
		await this.removeBusinessHoursFromUsers();
		const currentTime = moment.utc(moment().utc().format('dddd:HH:mm'), 'dddd:HH:mm');
		const day = currentTime.format('dddd');
		const businessHoursToOpenIds = await this.getBusinessHoursThatMustBeOpen(day, currentTime);
		await this.UsersRepository.openAgentsBusinessHours(businessHoursToOpenIds);
		await this.UsersRepository.updateLivechatStatusBasedOnBusinessHours();
	}

	private async getBusinessHoursThatMustBeOpen(day: string, currentTime: any): Promise<string[]> {
		const activeBusinessHours = await this.BusinessHourRepository.findActiveAndOpenBusinessHoursByDay(day, {
			fields: {
				workHours: 1,
				timezone: 1,
			},
		});
		return activeBusinessHours
			.filter((businessHour) => businessHour.workHours
				.filter((hour) => hour.day === day)
				.some((hour) => {
					const localTimeStart = moment.utc(`${ hour.day }:${ hour.start }`, 'dddd:HH:mm').add(businessHour.timezone.utc, 'hours');
					const localTimeFinish = moment.utc(`${ hour.day }:${ hour.finish }`, 'dddd:HH:mm').add(businessHour.timezone.utc, 'hours');
					const start = moment({
						hour: localTimeStart.hours(),
						minutes: localTimeStart.minutes(),
						weekday: currentTime.weekday(),
					});
					const finish = moment({
						hour: localTimeFinish.hours(),
						minutes: localTimeFinish.minutes(),
						weekday: currentTime.weekday(),
					});
					return currentTime.isSameOrAfter(start) && currentTime.isSameOrBefore(finish);
				}))
			.map((businessHour) => businessHour._id);
	}
}
