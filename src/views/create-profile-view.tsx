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
				'bg-game-surface w-full max-w-96 rounded-lg border border-white/10 shadow-xl',
				className
			)}
		>
			<div className="p-6">
				<h2 className="text-game-text mb-4 text-xl font-bold">
					{config.playerNameTitle}
				</h2>
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
							className="bg-game-bg text-game-text placeholder-game-text-muted focus:ring-game-primary w-full rounded-lg border border-white/20 px-4 py-2 focus:border-transparent focus:ring-2 focus:outline-none"
						/>
					</label>
					<button
						type="submit"
						className="bg-game-primary w-full rounded-lg px-4 py-2 font-medium text-white transition-colors hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
						disabled={!name.trim() || isLoading}
					>
						{isLoading ? (
							<>
								<span className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-b-2 border-white"></span>
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
