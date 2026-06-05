export default function CardData({ title, value, description, icon: Icon }) {
    return (
        <div className="rounded-2xl bg-stone-900/40 p-5 shadow-lg border border-stone-800 hover:border-stone-700 transition duration-300">
            <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-stone-400">{title}</h3>
                    <p className="mt-2 text-3xl font-bold text-white tracking-tight">{value}</p>
                </div>
                {Icon && (
                    <div className="bg-stone-800/30 p-2.5 rounded-xl text-stone-400 border border-white/5 flex items-center justify-center flex-shrink-0">
                        <Icon className="h-6 w-6" />
                    </div>
                )}
            </div>
            <p className="mt-3 text-xs text-stone-500 border-t border-white/5 pt-3">{description}</p>
        </div>
    );
}