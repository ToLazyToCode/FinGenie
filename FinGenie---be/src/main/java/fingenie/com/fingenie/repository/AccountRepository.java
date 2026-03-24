package fingenie.com.fingenie.repository;

import fingenie.com.fingenie.entity.Account;
import fingenie.com.fingenie.entity.Account.AuthProvider;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.util.List;
import java.util.Optional;

@Repository
public interface AccountRepository extends JpaRepository<Account, Long> {
    Optional<Account> findByEmail(String email);
    boolean existsByEmail(String email);
    
    /**
     * Find account by OAuth provider and provider-specific user ID
     * Used to match returning OAuth users
     */
    Optional<Account> findByProviderAndProviderId(AuthProvider provider, String providerId);
    
    /**
     * Check if an OAuth account exists for this provider/id combo
     */
    boolean existsByProviderAndProviderId(AuthProvider provider, String providerId);
    
    /**
     * Search users by email or name (case-insensitive partial match)
     * Excludes the current user from results
     */
    @Query("SELECT a FROM Account a WHERE a.id <> :currentUserId " +
           "AND (LOWER(a.email) LIKE LOWER(CONCAT('%', :query, '%')) " +
           "OR LOWER(a.name) LIKE LOWER(CONCAT('%', :query, '%')))")
    Page<Account> searchByEmailOrName(@Param("query") String query,
                                       @Param("currentUserId") Long currentUserId,
                                       Pageable pageable);

    // ── Admin dashboard queries ──────────────────────────────────────────────

    /** Count accounts that are active and not soft-deleted. */
    @Query("SELECT COUNT(a) FROM Account a WHERE a.isActive = true AND a.isDeleted = false")
    long countActiveAccounts();

    /** Count accounts created on or after the given timestamp (e.g. start of today). */
    @Query("SELECT COUNT(a) FROM Account a WHERE a.createdAt >= :since")
    long countNewAccountsSince(@Param("since") Timestamp since);

    /** Fetch all accounts created on or after the given timestamp (used for chart aggregation). */
    @Query("SELECT a FROM Account a WHERE a.createdAt >= :since")
    List<Account> findAccountsCreatedSince(@Param("since") Timestamp since);
}
