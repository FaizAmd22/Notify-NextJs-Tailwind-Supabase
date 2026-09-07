import getSongsBTitle from "@/actions/getSongsByTitle"
import Header from "@/components/Header"
import SearchInput from "@/components/SearchInput"
import SearchContent from "./components/SearchContent"

interface SearchProps {
    searchParams: {
        title: string
    }
}

const Search = async ({ searchParams }: SearchProps) => {
    const { songs, nextCursor } = await getSongsBTitle(searchParams.title)

    return (
        <div
            className="bg-neutral-900 rounded-lg h-full overflow-hidden overflow-y-auto w-[100vw] md:w-[70vw]"
        >
            <Header className="from-bg-neutral-900">
                <div className="mb-2 flex flex-col gap-y-6">
                    <h1 className="text-white text-3xl font-semibold">
                        Search
                    </h1>
                    <SearchInput />
                </div>
            </Header>
            <SearchContent
                songs={songs}
                nextCursor={nextCursor}
                title={searchParams.title ?? ''}
            />
        </div>
    )
}

export default Search