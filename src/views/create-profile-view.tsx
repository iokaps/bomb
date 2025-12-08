import { config } from '@/config';
import { playerActions } from '@/state/actions/player-actions';
import { cn } from '@/utils/cn';
import * as React from 'react';

interface Props {
	className?: string;
}

/**
 * View to create a player profile by entering a name
 */
export const CreateProfileView: React.FC<Props> = ({ className }) => {
	const [name, setName] = React.useState('');
	const [isLoading, setIsLoading] = React.useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		const trimmedName = name.trim();
		if (!trimmedName) return;

		setIsLoading(true);
		try {
			await playerActions.setPlayerName(trimmedName);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div
			className={cn(
				'bg-white border border-gray-200 rounded-lg shadow-md w-full max-w-96',
				className
			)}
		>
			<div className="p-6">
				<h2 className="text-xl font-bold mb-2">{config.playerNameTitle}</h2>
				<form onSubmit={handleSubmit} className="space-y-4">
					<label className="block">
						<input
							type="text"
							placeholder={config.playerNamePlaceholder}
							value={name}
							onChange={(e) => setName(e.target.value)}
							disabled={isLoading}
							autoFocus
							maxLength={50}
							className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</label>
					<button
						type="submit"
						className="w-full px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
						disabled={!name.trim() || isLoading}
					>
						{isLoading ? (
							<>
								<span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></span>
								{config.loading}
							</>
						) : (
							config.playerNameButton
						)}
					</button>
				</form>
			</div>
		</div>
	);
};
